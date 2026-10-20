-- Manual time entries, overlap protection, approval snapshot, legacy timer compatibility.
do $$
declare v_mon date := t.mon(); v_id uuid; v_id2 uuid; v_row record; v_n int;
begin
  perform t.login(t.u('w1'));
  v_id := public.submit_time_entry(v_mon, '07:00', '14:00', 60, t.r('a1'), null, null, 'Montage Fassade', null);
  select * into v_row from public.worker_time_entries where id = v_id;
  perform t.eq(v_row.worked_minutes, 360, '07:00-14:00 minus 60 min break = 360 minutes (6.00 h)');
  perform t.eq(v_row.status, 'submitted', 'manual entry is submitted for approval');
  perform t.eq(v_row.work_date, v_mon, 'work date derived from Zurich start time');
  perform t.eq(v_row.worksite, 'Bahnhofstrasse 10, 8001 Zürich', 'worksite defaults to assignment address');
  perform t.eq(v_row.source, 'manual', 'source is manual');
  perform t.eq(v_row.approved_minutes is null, true, 'no approved minutes before approval');

  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,null,null,%L)', v_mon, '13:00', '15:00', t.r('a2'), 'Overlap test'),
                   '%berschneidung%', 'overlapping entry on a different assignment is blocked');
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,null,null,%L)', v_mon, '06:00', '07:01', t.r('a1'), 'Overlap by one minute'),
                   '%berschneidung%', 'one minute overlap is blocked');

  v_id2 := public.submit_time_entry(v_mon, '14:00', '16:30', 15, t.r('a2'), null, null, 'Zweiter Auftrag', 'Kommentar');
  select * into v_row from public.worker_time_entries where id = v_id2;
  perform t.eq(v_row.worked_minutes, 135, 'second assignment same day, adjacent (14:00-16:30 - 15 = 135 min)');
  select count(distinct assignment_id) into v_n from public.worker_time_entries where worker_user_id = t.u('w1') and work_date = v_mon;
  perform t.eq(v_n, 2, 'employee works on two different assignments in one day');

  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,null,null,%L)', v_mon, '18:00', '17:00', t.r('a1'), 'Ende vor Start'),
                   '%Endzeit%', 'end before start rejected');
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,120,%L,null,null,%L)', v_mon + 1, '08:00', '09:00', t.r('a1'), 'Pause zu lang'),
                   '%Pause%', 'break longer than presence rejected');
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,null,null,%L)', v_mon + 1, '08:00', '09:00', t.r('a1'), 'x'),
                   '%Arbeitsbeschreibung%', 'description required');
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,null,null,null,%L)', v_mon + 1, '08:00', '09:00', 'Ohne Ziel'),
                   '%Auftrag oder ein Projekt%', 'assignment or project required');
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,%L,null,%L)', v_mon + 1, '08:00', '09:00', t.r('a1'), t.r('p1'), 'Beides'),
                   '%genau einen%', 'not both assignment and project');
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,null,null,%L)', current_date + 30, '08:00', '09:00', t.r('a1'), 'Zukunft'),
                   '%Zukunft%', 'far future date rejected');

  -- Apex project + Unterakkord assignment in the same month
  perform public.submit_time_entry(v_mon + 1, '07:00', '12:00', 30, null, t.r('p1'), null, 'Apex Projekt Montage', null);
  perform public.submit_time_entry(v_mon + 2, '07:00', '12:00', 30, t.r('a1'), null, null, 'Unterakkord Montage', null);
  select count(*) into v_n from public.worker_time_entries where worker_user_id = t.u('w1') and (project_id is not null or assignment_id is not null);
  perform t.eq(v_n >= 4, true, 'employee has entries for Apex project and Unterakkord in the same month');
  select source into v_row from public.worker_time_entries where project_id = t.r('p1') limit 1;

  -- direct tampering is blocked
  perform t.throws(format('insert into public.worker_time_entries (worker_user_id, worker_id, start_at, end_at, break_minutes, status, source) values (%L,%L,now() - interval ''40 days'', now() - interval ''40 days'' + interval ''1 hour'',0,''approved'',''manual'')', t.u('w1'), t.w('w1')),
                   '%Freigabe%', 'worker cannot insert an approved entry');
  perform t.throws(format('update public.worker_time_entries set status = ''approved'' where id = %L', v_id), '%nicht mehr direkt%', 'worker cannot approve own submitted entry');
  perform t.throws(format('update public.worker_time_entries set break_minutes = 0 where id = %L', v_id), '%nicht mehr direkt%', 'worker cannot edit a submitted entry directly');

  -- unassigned worker
  perform t.login(t.u('w3'));
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,%L,null,null,%L)', v_mon, '08:00', '09:00', t.r('a1'), 'Nicht zugeteilt'),
                   '%nicht zugeteilt%', 'worker not assigned to the assignment cannot report on it');
  perform t.throws(format('insert into public.worker_time_entries (worker_user_id, worker_id, start_at, end_at, break_minutes, status, source, assignment_id) values (%L,%L,now() - interval ''50 days'', now() - interval ''50 days'' + interval ''1 hour'',0,''submitted'',''manual'',%L)', t.u('w3'), t.w('w3'), t.r('a1')),
                   '%nicht zugeteilt%', 'direct insert for unassigned assignment blocked');
  perform t.login(t.u('w2'));
  perform t.throws(format('select public.submit_time_entry(%L,%L,%L,0,null,%L,null,%L)', v_mon, '08:00', '09:00', t.r('p1'), 'Projekt'),
                   '%nicht zugeteilt%', 'worker not on project cannot report on it');
  select count(*) into v_n from public.worker_time_entries where worker_user_id = t.u('w1');
  perform t.eq(v_n, 0, 'worker cannot read another worker''s entries');

  -- team leader sees entries of led assignment only
  perform t.login(t.u('tl'));
  select count(*) into v_n from public.worker_time_entries where assignment_id = t.r('a1');
  perform t.eq(v_n >= 2, true, 'team leader sees time entries of the led assignment');
  select count(*) into v_n from public.worker_time_entries where assignment_id = t.r('a2');
  perform t.eq(v_n, 0, 'team leader does not see entries of other assignments');

  -- approval by admin: approved / billable minutes and billing rate snapshot
  perform t.login(t.u('ad'));
  perform t.eq(public.approve_time_entries(array[v_id, v_id2], 'ok'), 2, 'admin approves two entries');
  select * into v_row from public.worker_time_entries where id = v_id;
  perform t.eq(v_row.approved_minutes, 360, 'approved minutes snapshot');
  perform t.eq(v_row.billable_minutes, 360, 'billable minutes default to approved minutes');
  perform t.eq(v_row.billing_rate, 46.00::numeric, 'default billing rate is 46.00 CHF');
  select * into v_row from public.worker_time_entries where id = v_id2;
  perform t.eq(v_row.billing_rate, 50.00::numeric, 'client specific billing rate (50.00) applies to its assignment');
  perform t.throws(format('select public.approve_time_entries(array[%L]::uuid[], null)', v_id), '%kann nicht freigegeben%', 'cannot approve twice');

  -- adjusting minutes keeps worked / approved / billable separate
  perform public.adjust_time_entry_minutes(v_id, 330, 300, 46.00, '30 Min. nicht verrechenbar (Wartezeit)');
  select * into v_row from public.worker_time_entries where id = v_id;
  perform t.eq(v_row.worked_minutes, 360, 'worked minutes unchanged');
  perform t.eq(v_row.approved_minutes, 330, 'approved minutes adjusted');
  perform t.eq(v_row.billable_minutes, 300, 'billable minutes adjusted independently');
  perform t.throws(format('select public.adjust_time_entry_minutes(%L, 999, null, null, %L)', v_id, 'zu viel'), '%zwischen 0%', 'approved minutes cannot exceed worked minutes');

  -- worker notified
  perform t.login(t.u('w1'));
  select count(*) into v_n from public.user_notifications where type = 'hours_approved';
  perform t.eq(v_n, 2, 'worker receives approval notifications');
  perform t.throws(format('update public.user_notifications set title = ''x'' where user_id = %L', t.u('w1')), '%permission denied%', 'notification text cannot be edited by client');
  update public.user_notifications set read_at = now() where user_id = t.u('w1');
  perform t.ok(true, 'worker can mark notifications read');

  -- worker edits / deletes only own non-approved manual entries
  perform t.throws(format('select public.delete_my_time_entry(%L)', v_id), '%Freigegebene%', 'approved entries cannot be deleted');
  v_id := public.submit_time_entry(v_mon + 3, '08:00', '12:00', 0, t.r('a1'), null, null, 'Test löschen', null);
  perform public.update_my_time_entry(v_id, '08:00', '11:00', 0, null, 'Test korrigiert', null);
  select worked_minutes into v_n from public.worker_time_entries where id = v_id;
  perform t.eq(v_n, 180, 'worker can correct a submitted manual entry');
  perform public.delete_my_time_entry(v_id);
  perform t.ok(not exists (select 1 from public.worker_time_entries where id = v_id), 'worker can delete a submitted manual entry');
  perform t.login(t.u('w2'));
  perform t.throws(format('select public.delete_my_time_entry(%L)', v_id2), '%nicht gefunden%', 'worker cannot delete someone else''s entry');
  perform t.root();
end $$;

-- Rejection requires a reason and can be undone by re-submitting a corrected entry.
do $$
declare v_mon date := t.mon(); v_id uuid; v_row record;
begin
  perform t.login(t.u('w2'));
  v_id := public.submit_time_entry(v_mon + 1, '07:00', '16:00', 60, t.r('a1'), null, null, 'Montage Süd', null);
  perform t.login(t.u('pm'));
  perform t.throws(format('select public.reject_time_entries(array[%L]::uuid[], '''')', v_id), '%Ablehnungsgrund%', 'rejection needs a reason');
  perform public.reject_time_entries(array[v_id], 'Pause fehlt im Rapport');
  perform t.login(t.u('w2'));
  perform t.eq((select status from public.worker_time_entries where id = v_id), 'rejected', 'entry rejected');
  perform public.update_my_time_entry(v_id, '07:00', '16:00', 60, null, 'Montage Süd (korrigiert)', null);
  perform t.eq((select status from public.worker_time_entries where id = v_id), 'submitted', 'corrected entry is re-submitted');
  perform t.root();
end $$;

-- Legacy timer flow (existing Worker dashboard) keeps working under the new guards.
do $$
declare v_id uuid; v_mon date := t.mon(); v_row record;
begin
  perform t.login(t.u('w3'));
  insert into public.worker_time_entries (worker_user_id, worker_id, work_date, start_at, break_minutes, status)
  values (t.u('w3'), t.w('w3'), v_mon + 1, (v_mon + 1 + time '07:00') at time zone 'Europe/Zurich', 90, 'running') returning id into v_id;
  update public.worker_time_entries set end_at = (v_mon + 1 + time '16:00') at time zone 'Europe/Zurich', worked_minutes = 450,
    break_minutes = 90, status = 'submitted', submitted_at = now() where id = v_id;
  select * into v_row from public.worker_time_entries where id = v_id;
  perform t.eq(v_row.worked_minutes, 450, 'legacy timer minutes are not recomputed');
  perform t.eq(v_row.source, 'timer', 'legacy source is timer');
  perform t.login(t.u('sa'));
  update public.worker_time_entries set status = 'approved', approved_by = t.u('sa'), approved_at = now() where id = v_id;
  select * into v_row from public.worker_time_entries where id = v_id;
  perform t.eq(v_row.approved_minutes, 450, 'legacy super admin approval gets approved_minutes snapshot');
  perform t.eq(v_row.billable_minutes is null, true, 'legacy timer entries without assignment are not billable');
  perform t.root();
end $$;
