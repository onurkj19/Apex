-- Tagesrapport: upload evidence, review lines, duplicates, transactional idempotent approval.
create table t.state (k text primary key, v text);
grant all on t.state to public;
create or replace function t.hash(p text) returns text language sql immutable as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;

do $$
declare v_day date := t.mon() + 4; v_rep uuid; v_rep2 uuid; v_n int; v_key text := 'k-' || gen_random_uuid()::text;
begin
  perform t.login(t.u('w1'));
  v_rep := public.create_daily_report(t.r('a1'), null, v_day, 'A-100', v_key);
  perform t.eq(public.create_daily_report(t.r('a1'), null, v_day, 'A-100', v_key), v_rep, 'report creation is idempotent per client key');
  insert into t.state values ('rep1', v_rep::text);
  update public.daily_reports set report_kind = 'group', team_leader_name = 'Worker TL' where id = v_rep;

  perform t.login(t.u('w3'));
  perform t.throws(format('select public.create_daily_report(%L, null, %L, null, null)', t.r('a1'), v_day), '%nicht zugeteilt%', 'unassigned worker cannot create a report');
  perform t.throws(format('insert into public.daily_reports (created_by, assignment_id, report_date) values (%L, %L, %L)', t.u('w3'), t.r('a1'), v_day), '%permission denied%', 'reports cannot be inserted directly');

  perform t.login(t.u('w1'));
  perform t.throws(format('insert into public.daily_report_files (report_id, storage_path, uploaded_by, sha256) values (%L, %L, %L, %L)', v_rep, t.u('w2')::text || '/x.jpg', t.u('w1'), t.hash('img1')),
                   '%row-level security%', 'file path must be in own storage folder');
  insert into public.daily_report_files (report_id, storage_path, original_name, mime_type, size_bytes, sha256)
  values (v_rep, t.u('w1')::text || '/' || v_rep::text || '/page1.jpg', 'IMG_1.jpg', 'image/jpeg', 12345, t.hash('img1'));
  perform t.ok(true, 'report file stored under the uploader folder');

  perform t.throws(format('insert into public.daily_report_lines (report_id, line_no, source, start_time, end_time) values (%L, 1, ''ai'', ''07:00'', ''16:00'')', v_rep),
                   '%serverseitig%', 'clients cannot create AI lines');
  perform t.throws(format('select public.submit_daily_report(%L)', v_rep), '%mindestens eine Zeile%', 'cannot submit without lines');

  insert into public.daily_report_lines (report_id, line_no, worker_id, worker_name_raw, start_time, end_time, break_minutes, reported_total_minutes)
  values (v_rep, 1, t.w('w1'), 'Worker W1', '07:00', '16:00', 60, 480),
         (v_rep, 2, t.w('w2'), 'Worker W2', '07:00', '16:00', 60, 480),
         (v_rep, 3, t.w('tl'), 'Worker TL', '07:00', '17:00', 60, 540);
  perform t.eq((select computed_minutes from public.daily_report_lines where report_id = v_rep and line_no = 1), 480, 'line minutes computed in DB: end - start - break');
  perform t.throws(format('select public.submit_daily_report(%L)', v_rep), '%bestätigt%', 'unverified lines block submission (nothing auto-approved)');
  update public.daily_report_lines set verified = true where report_id = v_rep;
  perform t.ok((select bool_and(verified_by = t.u('w1')) from public.daily_report_lines where report_id = v_rep), 'verifier recorded');
  perform t.eq((public.submit_daily_report(v_rep) ->> 'status'), 'submitted', 'report submitted');
  update public.daily_report_lines set notes = 'x' where report_id = v_rep;
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 0, 'lines are locked for the worker after submission');
  update public.daily_reports set notes = 'x' where id = v_rep;
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 0, 'header is locked for the worker after submission');
  perform t.throws(format('update public.daily_reports set status = ''approved'' where id = %L', v_rep), '%permission denied%', 'worker cannot set report status');

  -- second worker uploads the SAME paper report (same photo) with their own line
  perform t.login(t.u('w2'));
  v_rep2 := public.create_daily_report(t.r('a1'), null, v_day, 'A-100', null);
  insert into t.state values ('rep2', v_rep2::text);
  insert into public.daily_report_files (report_id, storage_path, sha256) values (v_rep2, t.u('w2')::text || '/' || v_rep2::text || '/foto.jpg', t.hash('img1'));
  insert into public.daily_report_lines (report_id, line_no, worker_id, start_time, end_time, break_minutes, verified)
  values (v_rep2, 1, t.w('w2'), '07:00', '16:00', 60, true);
  perform t.eq(public.submit_daily_report(v_rep2) ->> 'status', 'needs_review', 'duplicate upload is held for review');
  perform t.eq((select duplicate_resolution from public.daily_reports where id = v_rep2), 'pending', 'duplicate resolution is pending');
  perform t.eq((select duplicate_of from public.daily_reports where id = v_rep2), v_rep, 'points to the original report');
  perform t.ok((select exists (select 1 from jsonb_array_elements(duplicate_signals) s where s ->> 'type' = 'same_file_hash') from public.daily_reports where id = v_rep2), 'file hash is reported as a signal');
  perform t.ok((select exists (select 1 from jsonb_array_elements(duplicate_signals) s where s ->> 'type' = 'worker_overlap') from public.daily_reports where id = v_rep2), 'worker/date/assignment overlap is detected independently of the image hash');
  perform t.eq((select count(*) from public.daily_reports where id = v_rep)::int, 0, 'worker cannot read another worker''s report');
  perform t.eq((select count(*) from public.daily_report_lines where report_id = v_rep)::int, 0, 'worker cannot read another report''s lines');

  -- different photo of the same sheet (hash differs) is still caught by worker overlap
  perform t.login(t.u('tl'));
  perform t.eq((select count(*) from public.daily_reports where id = v_rep)::int, 1, 'team leader can read reports of the led assignment');
  perform t.root();
end $$;

do $$
declare v_rep uuid := (select v::uuid from t.state where k = 'rep1'); v_rep2 uuid := (select v::uuid from t.state where k = 'rep2');
        v_res jsonb; v_n int; v_w3 uuid;
begin
  perform t.login(t.u('ad'));
  v_res := public.approve_daily_report(v_rep2, null);
  perform t.eq((v_res ->> 'approved')::boolean, false, 'a report with an open duplicate conflict cannot be approved');
  perform t.eq(v_res #>> '{blockers,0,reason}', 'duplicate_pending', 'blocker is duplicate_pending');
  perform t.throws(format('select public.resolve_report_duplicate(%L, ''bogus'', null)', v_rep2), '%Ungültige%', 'resolution must be one of the explicit options');
  perform t.login(t.u('pm'));
  perform public.resolve_report_duplicate(v_rep2, 'discard_this', 'gleiches Blatt');
  perform t.eq((select status from public.daily_reports where id = v_rep2), 'duplicate', 'duplicate report discarded');
  perform t.throws(format('select public.resolve_report_duplicate(%L, ''keep_both'', null)', v_rep2), '%Kein offener%', 'cannot resolve twice');

  v_res := public.preview_report_approval(v_rep);
  perform t.eq((v_res ->> 'can_approve')::boolean, true, 'preview: original report is approvable');
  perform t.eq(jsonb_array_length(v_res -> 'plan'), 3, 'preview lists three lines');

  perform t.login(t.u('w1'));
  perform t.throws(format('select public.approve_daily_report(%L, null)', v_rep), '%Keine Berechtigung%', 'worker cannot approve reports');
  perform t.login(t.u('ad'));
  v_res := public.approve_daily_report(v_rep, 'geprüft');
  perform t.eq((v_res ->> 'created')::int, 3, 'approval creates one entry per employee');
  perform t.eq((select count(*) from public.worker_time_entries where daily_report_id = v_rep)::int, 3, 'three time entries are linked to the report');
  perform t.eq((select count(*) from public.worker_time_entries where worker_id = t.w('w2') and work_date = t.mon() + 4)::int, 1, 'no duplicate entry for the employee who uploaded the same sheet twice');
  perform t.eq((select status from public.worker_time_entries where worker_id = t.w('w1') and daily_report_id = v_rep), 'approved', 'entries are approved');
  perform t.eq((select source from public.worker_time_entries where worker_id = t.w('w1') and daily_report_id = v_rep), 'group_report', 'source is group_report');
  perform t.eq((select billing_rate from public.worker_time_entries where worker_id = t.w('w1') and daily_report_id = v_rep), 46.00::numeric, 'billing snapshot at default rate');
  perform t.eq((select approved_minutes from public.worker_time_entries where worker_id = t.w('tl') and daily_report_id = v_rep), 540, 'TL line 07:00-17:00 minus 60 = 540 min');
  v_res := public.approve_daily_report(v_rep, 'nochmal');
  perform t.eq((v_res ->> 'idempotent')::boolean, true, 'second approval is a no-op (idempotent)');
  perform t.eq((select count(*) from public.worker_time_entries where daily_report_id = v_rep)::int, 3, 'still three entries after re-approval');
  perform t.throws(format('select public.reject_daily_report(%L, ''doch nicht'')', v_rep), '%Nur eingereichte%', 'approved reports cannot be rejected');

  perform t.login(t.u('w2'));
  perform t.eq((select count(*) from public.user_notifications where type in ('hours_approved', 'report_duplicate'))::int >= 2, true, 'employees are notified');
  perform t.root();
end $$;

-- Conflicts with an existing manual entry must be resolved explicitly.
do $$
declare v_day date := t.mon() + 3; v_rep uuid; v_entry uuid; v_res jsonb; v_line uuid; v_line2 uuid;
begin
  perform t.login(t.u('w1'));
  v_entry := public.submit_time_entry(v_day, '07:00', '11:00', 0, t.r('a1'), null, null, 'Manueller Eintrag', null);
  perform t.login(t.u('tl'));
  v_rep := public.create_daily_report(t.r('a1'), null, v_day, 'A-100', null);
  insert into public.daily_report_files (report_id, storage_path, sha256) values (v_rep, t.u('tl')::text || '/' || v_rep::text || '/a.jpg', t.hash('img-conflict'));
  insert into public.daily_report_lines (report_id, line_no, worker_id, start_time, end_time, break_minutes, verified)
  values (v_rep, 1, t.w('w1'), '08:00', '12:00', 0, true), (v_rep, 2, t.w('w2'), '08:00', '12:00', 0, true);
  perform t.ok(public.submit_daily_report(v_rep) ->> 'status' = 'submitted', 'report with existing-entry overlap is submitted (resolved at approval)');
  select id into v_line from public.daily_report_lines where report_id = v_rep and line_no = 1;
  select id into v_line2 from public.daily_report_lines where report_id = v_rep and line_no = 2;

  perform t.login(t.u('ad'));
  v_res := public.approve_daily_report(v_rep, null);
  perform t.eq((v_res ->> 'approved')::boolean, false, 'approval blocked by conflicting time entry');
  perform t.eq(v_res #>> '{blockers,0,reason}', 'conflict', 'blocker reason is conflict');
  perform t.eq((select count(*) from public.worker_time_entries where daily_report_id = v_rep)::int, 0, 'nothing was written (transactional)');
  perform public.resolve_report_line(v_line, 'replace_existing', 'Rapport ist massgebend');
  v_res := public.approve_daily_report(v_rep, null);
  perform t.eq((v_res ->> 'approved')::boolean, true, 'approved after explicit conflict resolution');
  perform t.eq((v_res ->> 'replaced')::int, 1, 'existing entry replaced');
  perform t.eq((select status from public.worker_time_entries where id = v_entry), 'rejected', 'replaced entry is rejected, not deleted');
  perform t.eq((select approved_minutes from public.worker_time_entries where worker_id = t.w('w1') and daily_report_id = v_rep), 240, 'new entry from report: 08:00-12:00');
  perform t.throws(format('select public.resolve_report_line(%L, ''skip'', null)', v_line), '%bereits freigegeben%', 'approved report lines are locked');
  perform t.root();
end $$;

-- Rejection flow and incomplete data.
do $$
declare v_day date := t.mon() + 2; v_rep uuid; v_res jsonb;
begin
  perform t.login(t.u('w2'));
  v_rep := public.create_daily_report(t.r('a1'), null, v_day, null, null);
  insert into public.daily_report_files (report_id, storage_path, sha256) values (v_rep, t.u('w2')::text || '/' || v_rep::text || '/b.jpg', t.hash('img-b'));
  insert into public.daily_report_lines (report_id, line_no, worker_id, start_time, end_time, break_minutes, verified)
  values (v_rep, 1, t.w('w2'), '07:00', null, 0, true);
  perform t.throws(format('select public.submit_daily_report(%L)', v_rep), '%vollständig%', 'lines need start and end time');
  update public.daily_report_lines set end_time = '15:30' where report_id = v_rep;
  perform public.submit_daily_report(v_rep);
  perform t.login(t.u('ad'));
  perform t.throws(format('select public.reject_daily_report(%L, '''')', v_rep), '%Grund%', 'rejection needs a reason');
  perform public.reject_daily_report(v_rep, 'Foto unleserlich');
  perform t.login(t.u('w2'));
  perform t.eq((select status from public.daily_reports where id = v_rep), 'rejected', 'report rejected');
  perform t.ok(exists (select 1 from public.user_notifications where type = 'report_rejected'), 'uploader notified of rejection');
  update public.daily_report_lines set end_time = '16:00' where report_id = v_rep;
  perform t.eq(public.submit_daily_report(v_rep) ->> 'status', 'submitted', 'rejected report can be corrected and re-submitted');
  perform t.root();
end $$;

-- Unresolved worker blocks approval (AI could not match a name)
do $$
declare v_day date := t.mon() + 2; v_rep uuid; v_res jsonb; v_n int;
begin
  perform t.login(t.u('tl'));
  v_rep := public.create_daily_report(t.r('a1'), null, v_day, 'A-100', null);
  insert into public.daily_report_files (report_id, storage_path, sha256) values (v_rep, t.u('tl')::text || '/' || v_rep::text || '/c.jpg', t.hash('img-c'));
  insert into public.daily_report_lines (report_id, line_no, worker_id, worker_name_raw, start_time, end_time, break_minutes, verified)
  values (v_rep, 1, null, 'Unbekannter Name', '07:00', '16:00', 60, true);
  perform public.submit_daily_report(v_rep);
  perform t.login(t.u('ad'));
  v_res := public.approve_daily_report(v_rep, null);
  perform t.eq(v_res #>> '{blockers,0,reason}', 'worker_unresolved', 'unmatched employee name blocks approval');
  perform t.root();
end $$;

-- Storage policies for the private bucket
do $$
declare v_n int;
begin
  perform t.login(t.u('w1'));
  insert into storage.objects (bucket_id, name) values ('daily-reports', t.u('w1')::text || '/r1/a.jpg');
  perform t.throws(format('insert into storage.objects (bucket_id, name) values (''daily-reports'', %L)', t.u('w2')::text || '/r1/a.jpg'), '%row-level security%', 'cannot upload into another user''s folder');
  perform t.login(t.u('w2'));
  select count(*) into v_n from storage.objects where bucket_id = 'daily-reports';
  perform t.eq(v_n, 0, 'other workers cannot read uploaded evidence');
  perform t.login(t.u('ad'));
  select count(*) into v_n from storage.objects where bucket_id = 'daily-reports';
  perform t.eq(v_n, 1, 'admins can read uploaded evidence (via signed URLs)');
  perform t.login(t.u('w1'));
  delete from storage.objects where bucket_id = 'daily-reports';
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 0, 'evidence cannot be deleted by employees');
  perform t.anon();
  select count(*) into v_n from storage.objects where bucket_id = 'daily-reports';
  perform t.eq(v_n, 0, 'anonymous users cannot read evidence');
  perform t.root();
  perform t.eq((select public from storage.buckets where id = 'daily-reports'), false, 'bucket is private');
end $$;
