-- V2 / 4: Tagesrapport (daily report) evidence, AI extraction results, duplicate detection,
-- review & transactional/idempotent approval that creates time entries.
-- Additive only.

-- ---------------------------------------------------------------------------
-- Private storage bucket for scanned / photographed paper reports
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily-reports', 'daily-reports', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

drop policy if exists "daily_reports_insert_own_folder" on storage.objects;
create policy "daily_reports_insert_own_folder" on storage.objects for insert to authenticated
with check (bucket_id = 'daily-reports' and (storage.foldername(name))[1] = auth.uid()::text
            and public.has_app_role(auth.uid(), array['worker','team_leader','admin','super_admin','project_manager']));

drop policy if exists "daily_reports_read_own_or_staff" on storage.objects;
create policy "daily_reports_read_own_or_staff" on storage.objects for select to authenticated
using (bucket_id = 'daily-reports'
       and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));
-- No update/delete policies: evidence is immutable for clients.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.daily_reports (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references public.users(id) on delete restrict,
  uploader_worker_id uuid references public.workers(id) on delete set null,
  assignment_id uuid references public.subcontract_assignments(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  report_date date not null,
  document_number text,
  external_company text,
  team_leader_name text,
  notes text,
  report_kind text not null default 'individual' check (report_kind in ('individual', 'group')),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'needs_review', 'approved', 'rejected', 'duplicate')),
  extraction_status text not null default 'not_requested'
    check (extraction_status in ('not_requested', 'pending', 'processing', 'succeeded', 'failed', 'not_configured')),
  extraction_error text,
  lines_from_ai boolean not null default false,
  duplicate_of uuid references public.daily_reports(id) on delete set null,
  duplicate_signals jsonb not null default '[]'::jsonb,
  duplicate_resolution text not null default 'none'
    check (duplicate_resolution in ('none', 'pending', 'discarded', 'kept_primary', 'kept_both')),
  idempotency_key text,
  submitted_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reports_single_target check (num_nonnulls(assignment_id, project_id) = 1)
);
create unique index if not exists uq_daily_reports_idem on public.daily_reports (created_by, idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_daily_reports_status on public.daily_reports (status, report_date desc);
create index if not exists idx_daily_reports_target_date on public.daily_reports (assignment_id, project_id, report_date);

create table if not exists public.daily_report_files (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  page_no integer not null default 1,
  uploaded_by uuid not null default auth.uid() references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_daily_report_files_report on public.daily_report_files (report_id);
create index if not exists idx_daily_report_files_hash on public.daily_report_files (sha256) where sha256 is not null;

create table if not exists public.daily_report_lines (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  line_no integer not null default 1,
  worker_id uuid references public.workers(id) on delete set null,
  worker_name_raw text,
  start_time time,
  end_time time,
  break_minutes integer not null default 0 check (break_minutes >= 0 and break_minutes <= 480),
  reported_total_minutes integer check (reported_total_minutes is null or reported_total_minutes between 0 and 1440),
  computed_minutes integer,
  confidence numeric(3,2) check (confidence is null or confidence between 0 and 1),
  flags jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('ai', 'manual')),
  verified boolean not null default false,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  resolution text check (resolution is null or resolution in ('skip', 'link_existing', 'replace_existing')),
  time_entry_id uuid references public.worker_time_entries(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, line_no)
);
create index if not exists idx_daily_report_lines_worker on public.daily_report_lines (worker_id);

create table if not exists public.daily_report_extractions (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  provider text,
  model text,
  status text not null check (status in ('succeeded', 'failed', 'not_configured')),
  raw_result jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_daily_report_extractions_report on public.daily_report_extractions (report_id);

-- time entries reference reports (columns created in previous migration)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'wte_daily_report_fk') then
    alter table public.worker_time_entries add constraint wte_daily_report_fk
      foreign key (daily_report_id) references public.daily_reports(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wte_daily_report_line_fk') then
    alter table public.worker_time_entries add constraint wte_daily_report_line_fk
      foreign key (daily_report_line_id) references public.daily_report_lines(id) on delete set null;
  end if;
end $$;

drop trigger if exists trg_daily_reports_updated_at on public.daily_reports;
create trigger trg_daily_reports_updated_at before update on public.daily_reports
for each row execute function public.set_updated_at();
drop trigger if exists trg_daily_report_lines_updated_at on public.daily_report_lines;
create trigger trg_daily_report_lines_updated_at before update on public.daily_report_lines
for each row execute function public.set_updated_at();

-- append-only extraction history
create or replace function public.block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Diese Tabelle ist unveränderlich (append-only).' using errcode = '42501';
end;
$$;
drop trigger if exists trg_extractions_immutable on public.daily_report_extractions;
create trigger trg_extractions_immutable before update or delete on public.daily_report_extractions
for each row execute function public.block_mutation();

-- ---------------------------------------------------------------------------
-- Line integrity: computed minutes (end - start - break); AI lines can never be created by clients
-- ---------------------------------------------------------------------------
create or replace function public.report_line_integrity()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.source = 'ai' then
      raise exception 'KI-Zeilen werden ausschließlich serverseitig erzeugt.' using errcode = '42501';
    end if;
    if new.time_entry_id is not null and (tg_op = 'INSERT' or new.time_entry_id is distinct from old.time_entry_id) then
      raise exception 'time_entry_id darf nicht direkt gesetzt werden.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      if new.source is distinct from old.source then
        raise exception 'Quelle darf nicht geändert werden.' using errcode = '42501';
      end if;
      if new.resolution is distinct from old.resolution and not public.can_approve_hours(auth.uid()) then
        raise exception 'Konfliktlösung nur durch die Verwaltung.' using errcode = '42501';
      end if;
    end if;
    if new.verified and (tg_op = 'INSERT' or not old.verified) then
      new.verified_by := auth.uid();
      new.verified_at := now();
    end if;
  end if;

  if new.start_time is not null and new.end_time is not null and new.end_time > new.start_time then
    new.computed_minutes := (extract(epoch from (new.end_time - new.start_time)) / 60)::integer - coalesce(new.break_minutes, 0);
  else
    new.computed_minutes := null;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_report_line_integrity on public.daily_report_lines;
create trigger trg_report_line_integrity before insert or update on public.daily_report_lines
for each row execute function public.report_line_integrity();

-- Reports: clients may only change header fields; membership is validated for target changes.
create or replace function public.report_header_integrity()
returns trigger language plpgsql as $$
declare v_wid uuid;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'UPDATE' and not public.can_approve_hours(auth.uid()) then
    if new.assignment_id is distinct from old.assignment_id or new.project_id is distinct from old.project_id then
      v_wid := public.current_worker_id();
      if new.assignment_id is not null and not (public.worker_on_assignment(v_wid, new.assignment_id, new.report_date)
                                                or public.leads_assignment(new.assignment_id)) then
        raise exception 'Du bist diesem Auftrag nicht zugeteilt.' using errcode = '42501';
      end if;
      if new.project_id is not null and not public.worker_on_project(v_wid, new.project_id) then
        raise exception 'Du bist diesem Projekt nicht zugeteilt.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_report_header_integrity on public.daily_reports;
create trigger trg_report_header_integrity before update on public.daily_reports
for each row execute function public.report_header_integrity();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.daily_reports enable row level security;
alter table public.daily_report_files enable row level security;
alter table public.daily_report_lines enable row level security;
alter table public.daily_report_extractions enable row level security;

create or replace function public.can_read_report(p_report uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.daily_reports r
    where r.id = p_report
      and (r.created_by = auth.uid() or public.is_staff(auth.uid())
           or (r.assignment_id is not null and public.leads_assignment(r.assignment_id)))
  );
$$;
create or replace function public.can_edit_report_content(p_report uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.daily_reports r
    where r.id = p_report
      and ((r.created_by = auth.uid() and r.status in ('draft', 'rejected'))
           or (public.can_approve_hours(auth.uid()) and r.status in ('draft', 'submitted', 'needs_review', 'rejected')))
  );
$$;
revoke execute on function public.can_read_report(uuid), public.can_edit_report_content(uuid) from public, anon;
grant execute on function public.can_read_report(uuid), public.can_edit_report_content(uuid) to authenticated;

drop policy if exists reports_read on public.daily_reports;
create policy reports_read on public.daily_reports for select to authenticated
using (created_by = auth.uid() or public.is_staff(auth.uid())
       or (assignment_id is not null and public.leads_assignment(assignment_id)));
drop policy if exists reports_update on public.daily_reports;
create policy reports_update on public.daily_reports for update to authenticated
using (public.can_edit_report_content(id)) with check (public.can_edit_report_content(id));
revoke insert, update, delete on public.daily_reports from authenticated, anon;
grant update (report_date, document_number, external_company, team_leader_name, notes, report_kind, assignment_id, project_id)
  on public.daily_reports to authenticated;

drop policy if exists report_files_read on public.daily_report_files;
create policy report_files_read on public.daily_report_files for select to authenticated
using (public.can_read_report(report_id));
drop policy if exists report_files_insert on public.daily_report_files;
create policy report_files_insert on public.daily_report_files for insert to authenticated
with check (uploaded_by = auth.uid() and public.can_edit_report_content(report_id)
            and (storage_path like auth.uid()::text || '/%'));
revoke update, delete on public.daily_report_files from authenticated, anon;

drop policy if exists report_lines_read on public.daily_report_lines;
create policy report_lines_read on public.daily_report_lines for select to authenticated
using (public.can_read_report(report_id));
drop policy if exists report_lines_write on public.daily_report_lines;
create policy report_lines_write on public.daily_report_lines for all to authenticated
using (public.can_edit_report_content(report_id)) with check (public.can_edit_report_content(report_id));

drop policy if exists report_extractions_read on public.daily_report_extractions;
create policy report_extractions_read on public.daily_report_extractions for select to authenticated
using (public.can_read_report(report_id));
revoke insert, update, delete on public.daily_report_extractions from authenticated, anon;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_daily_report(
  p_assignment_id uuid, p_project_id uuid, p_report_date date,
  p_document_number text default null, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_wid uuid; v_id uuid;
begin
  if v_uid is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  select worker_id into v_wid from public.users where id = v_uid and is_active;
  if not found then raise exception 'Konto ist nicht aktiv.' using errcode = '42501'; end if;
  if p_idempotency_key is not null then
    select id into v_id from public.daily_reports where created_by = v_uid and idempotency_key = p_idempotency_key;
    if found then return v_id; end if;
  end if;
  if num_nonnulls(p_assignment_id, p_project_id) <> 1 then
    raise exception 'Bitte genau einen Auftrag oder ein Projekt wählen.' using errcode = '22023';
  end if;
  if p_report_date is null then raise exception 'Datum fehlt.' using errcode = '22023'; end if;
  if p_assignment_id is not null then
    if not (public.worker_on_assignment(v_wid, p_assignment_id, p_report_date) or public.leads_assignment(p_assignment_id)
            or public.can_approve_hours(v_uid)) then
      raise exception 'Du bist diesem Auftrag an diesem Datum nicht zugeteilt.' using errcode = '42501';
    end if;
  elsif not (public.worker_on_project(v_wid, p_project_id) or public.can_approve_hours(v_uid)) then
    raise exception 'Du bist diesem Projekt nicht zugeteilt.' using errcode = '42501';
  end if;

  insert into public.daily_reports (created_by, uploader_worker_id, assignment_id, project_id, report_date,
                                    document_number, idempotency_key)
  values (v_uid, v_wid, p_assignment_id, p_project_id, p_report_date,
          nullif(btrim(coalesce(p_document_number, '')), ''), p_idempotency_key)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.detect_report_duplicates(p_report uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.daily_reports; v jsonb := '[]'::jsonb; x record;
begin
  select * into r from public.daily_reports where id = p_report;
  if not found then return v; end if;
  if auth.uid() is not null and not (r.created_by = auth.uid() or public.is_staff(auth.uid())) then
    raise exception 'Keine Berechtigung.' using errcode = '42501';
  end if;

  for x in
    select distinct d.id as other_id, f2.sha256
    from public.daily_report_files f1
    join public.daily_report_files f2 on f2.sha256 = f1.sha256 and f2.report_id <> f1.report_id
    join public.daily_reports d on d.id = f2.report_id
    where f1.report_id = p_report and f1.sha256 is not null and d.status not in ('draft', 'rejected', 'duplicate')
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'same_file_hash', 'strength', 'strong',
                                                   'report_id', x.other_id, 'detail', 'Identische Bilddatei'));
  end loop;

  for x in
    select distinct d.id as other_id, l2.worker_id, w.full_name
    from public.daily_report_lines l1
    join public.daily_report_lines l2 on l2.worker_id = l1.worker_id and l2.report_id <> l1.report_id
    join public.daily_reports d on d.id = l2.report_id
    join public.workers w on w.id = l1.worker_id
    where l1.report_id = p_report and l1.worker_id is not null
      and d.status not in ('draft', 'rejected', 'duplicate')
      and d.report_date = r.report_date
      and d.assignment_id is not distinct from r.assignment_id
      and d.project_id is not distinct from r.project_id
      and (l1.start_time is null or l1.end_time is null or l2.start_time is null or l2.end_time is null
           or (l1.start_time < l2.end_time and l2.start_time < l1.end_time))
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'worker_overlap', 'strength', 'strong',
      'report_id', x.other_id, 'worker_id', x.worker_id,
      'detail', x.full_name || ' ist am selben Tag für denselben Auftrag bereits in einem anderen Rapport erfasst'));
  end loop;

  if r.document_number is not null then
    for x in
      select d.id as other_id from public.daily_reports d
      where d.id <> r.id and d.status not in ('draft', 'rejected', 'duplicate')
        and d.report_date = r.report_date
        and d.assignment_id is not distinct from r.assignment_id and d.project_id is not distinct from r.project_id
        and lower(btrim(d.document_number)) = lower(btrim(r.document_number))
    loop
      v := v || jsonb_build_array(jsonb_build_object('type', 'same_document_number', 'strength', 'weak',
        'report_id', x.other_id, 'detail', 'Gleiche Auftragsnummer am selben Tag (evtl. zweite Gruppe)'));
    end loop;
  end if;

  for x in
    select e.id as entry_id, l.worker_id, w.full_name
    from public.daily_report_lines l
    join public.workers w on w.id = l.worker_id
    join public.worker_time_entries e on e.worker_id = l.worker_id and e.status <> 'rejected'
      and e.daily_report_line_id is distinct from l.id
      and tstzrange(e.start_at, coalesce(e.end_at, e.start_at + interval '1 minute'), '[)')
          && tstzrange((r.report_date + l.start_time) at time zone 'Europe/Zurich',
                       (r.report_date + l.end_time) at time zone 'Europe/Zurich', '[)')
    where l.report_id = p_report and l.start_time is not null and l.end_time is not null and l.end_time > l.start_time
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'existing_time_entry', 'strength', 'info',
      'entry_id', x.entry_id, 'worker_id', x.worker_id,
      'detail', x.full_name || ' hat für diese Zeit bereits einen Zeiteintrag'));
  end loop;
  return v;
end;
$$;

create or replace function public.submit_daily_report(p_report uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.daily_reports; v_signals jsonb; v_strong jsonb; v_bad integer; v_files integer; v_lines integer;
begin
  select * into r from public.daily_reports where id = p_report for update;
  if not found or r.created_by is distinct from auth.uid() then
    raise exception 'Rapport nicht gefunden.' using errcode = '42501';
  end if;
  if r.status not in ('draft', 'rejected') then
    raise exception 'Der Rapport wurde bereits eingereicht.' using errcode = '22023';
  end if;
  select count(*) into v_files from public.daily_report_files where report_id = p_report;
  if v_files = 0 then raise exception 'Bitte zuerst ein Foto des Tagesrapports hochladen.' using errcode = '22023'; end if;
  select count(*) into v_lines from public.daily_report_lines where report_id = p_report;
  if v_lines = 0 then raise exception 'Bitte mindestens eine Zeile mit Arbeitszeiten erfassen.' using errcode = '22023'; end if;
  select count(*) into v_bad from public.daily_report_lines l
   where l.report_id = p_report
     and (l.verified is not true or l.start_time is null or l.end_time is null or l.computed_minutes is null or l.computed_minutes <= 0);
  if v_bad > 0 then
    raise exception 'Alle Zeilen müssen vollständig sein und bestätigt werden (% offen).', v_bad using errcode = '22023';
  end if;

  v_signals := public.detect_report_duplicates(p_report);
  select coalesce(jsonb_agg(s), '[]'::jsonb) into v_strong from jsonb_array_elements(v_signals) s where s ->> 'strength' = 'strong';

  update public.daily_reports set
    submitted_at = now(), reviewed_by = null, reviewed_at = null, review_comment = null,
    duplicate_signals = v_signals,
    duplicate_of = case when jsonb_array_length(v_strong) > 0 then (v_strong -> 0 ->> 'report_id')::uuid else null end,
    duplicate_resolution = case when jsonb_array_length(v_strong) > 0 then 'pending' else 'none' end,
    status = case when jsonb_array_length(v_strong) > 0 then 'needs_review' else 'submitted' end
  where id = p_report;

  perform public.notify_approvers(
    case when jsonb_array_length(v_strong) > 0 then 'report_duplicate' else 'report_submitted' end,
    'Neuer Tagesrapport', 'Ein Tagesrapport wartet auf Prüfung.', '/admin/tagesrapporte',
    jsonb_build_object('report_id', p_report));
  return jsonb_build_object('status', case when jsonb_array_length(v_strong) > 0 then 'needs_review' else 'submitted' end,
                            'duplicate_signals', v_signals);
end;
$$;

create or replace function public.resolve_report_duplicate(p_report uuid, p_resolution text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.daily_reports; o public.daily_reports;
begin
  if not public.can_approve_hours(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if p_resolution not in ('discard_this', 'discard_other', 'keep_both') then
    raise exception 'Ungültige Auswahl.' using errcode = '22023';
  end if;
  select * into r from public.daily_reports where id = p_report for update;
  if not found then raise exception 'Rapport nicht gefunden.'; end if;
  if r.duplicate_resolution <> 'pending' then raise exception 'Kein offener Duplikat-Konflikt.' using errcode = '22023'; end if;

  if p_resolution = 'discard_this' then
    update public.daily_reports set status = 'duplicate', duplicate_resolution = 'discarded',
      reviewed_by = auth.uid(), reviewed_at = now(), review_comment = p_comment where id = p_report;
    perform public.notify_user(r.created_by, 'report_duplicate', 'Tagesrapport als Duplikat markiert',
      'Dein Rapport vom ' || to_char(r.report_date, 'DD.MM.YYYY') || ' war bereits erfasst.', '/portal/rapport', jsonb_build_object('report_id', p_report));
  elsif p_resolution = 'discard_other' then
    select * into o from public.daily_reports where id = r.duplicate_of for update;
    if found then
      if o.status = 'approved' then
        raise exception 'Der andere Rapport ist bereits freigegeben und kann nicht verworfen werden.' using errcode = '22023';
      end if;
      update public.daily_reports set status = 'duplicate', duplicate_resolution = 'discarded', duplicate_of = r.id,
        reviewed_by = auth.uid(), reviewed_at = now(), review_comment = p_comment where id = o.id;
    end if;
    update public.daily_reports set duplicate_resolution = 'kept_primary', status = 'submitted' where id = p_report;
  else
    update public.daily_reports set duplicate_resolution = 'kept_both', status = 'submitted' where id = p_report;
  end if;
end;
$$;

-- Per-line plan used by both preview and approval (no writes).
create or replace function public.report_approval_plan(p_report uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r public.daily_reports; l public.daily_report_lines; v_out jsonb := '[]'::jsonb;
  v_user uuid; v_entry public.worker_time_entries; v_start timestamptz; v_end timestamptz;
  v_action text; v_reason text; v_dup uuid;
begin
  select * into r from public.daily_reports where id = p_report;
  if not found then return v_out; end if;
  for l in select * from public.daily_report_lines where report_id = p_report order by line_no loop
    v_action := 'create'; v_reason := null; v_entry := null; v_dup := null;
    if l.time_entry_id is not null then
      v_action := 'already';
    elsif l.resolution = 'skip' then
      v_action := 'skip';
    elsif l.verified is not true then
      v_action := 'blocker'; v_reason := 'not_verified';
    elsif l.worker_id is null then
      v_action := 'blocker'; v_reason := 'worker_unresolved';
    elsif l.start_time is null or l.end_time is null then
      v_action := 'blocker'; v_reason := 'times_missing';
    elsif l.computed_minutes is null or l.computed_minutes <= 0 then
      v_action := 'blocker'; v_reason := 'invalid_hours';
    else
      select u.id into v_user from public.users u where u.worker_id = l.worker_id and u.is_active limit 1;
      if v_user is null then
        v_action := 'blocker'; v_reason := 'no_account';
      else
        select l2.id into v_dup from public.daily_report_lines l2
         where l2.report_id = p_report and l2.id <> l.id and l2.line_no < l.line_no and l2.worker_id = l.worker_id
           and l2.resolution is distinct from 'skip' and l2.start_time < l.end_time and l.start_time < l2.end_time limit 1;
        if v_dup is not null then
          v_action := 'blocker'; v_reason := 'duplicate_line_in_report';
        else
          v_start := (r.report_date + l.start_time) at time zone 'Europe/Zurich';
          v_end := (r.report_date + l.end_time) at time zone 'Europe/Zurich';
          select e.* into v_entry from public.worker_time_entries e
           where e.worker_user_id = v_user and e.status <> 'rejected'
             and tstzrange(e.start_at, coalesce(e.end_at, e.start_at + interval '1 minute'), '[)') && tstzrange(v_start, v_end, '[)')
           order by e.start_at limit 1;
          if v_entry.id is not null then
            if l.resolution = 'link_existing' then v_action := 'link';
            elsif l.resolution = 'replace_existing' then v_action := 'replace';
            else v_action := 'blocker'; v_reason := 'conflict';
            end if;
          end if;
        end if;
      end if;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'line_id', l.id, 'line_no', l.line_no, 'worker_id', l.worker_id, 'action', v_action, 'reason', v_reason,
      'conflict_entry_id', v_entry.id, 'conflict_status', v_entry.status,
      'conflict_start', v_entry.start_at, 'conflict_end', v_entry.end_at));
  end loop;
  return v_out;
end;
$$;

create or replace function public.preview_report_approval(p_report uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_plan jsonb; r public.daily_reports;
begin
  if not public.can_approve_hours(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  select * into r from public.daily_reports where id = p_report;
  if not found then raise exception 'Rapport nicht gefunden.'; end if;
  v_plan := public.report_approval_plan(p_report);
  return jsonb_build_object(
    'plan', v_plan,
    'duplicate_pending', r.duplicate_resolution = 'pending',
    'can_approve', r.duplicate_resolution <> 'pending'
                   and r.status in ('submitted', 'needs_review')
                   and not exists (select 1 from jsonb_array_elements(v_plan) x where x ->> 'action' = 'blocker')
                   and jsonb_array_length(v_plan) > 0);
end;
$$;

create or replace function public.resolve_report_line(p_line uuid, p_action text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare l public.daily_report_lines; r public.daily_reports;
begin
  if not public.can_approve_hours(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if p_action is not null and p_action not in ('skip', 'link_existing', 'replace_existing') then
    raise exception 'Ungültige Auswahl.' using errcode = '22023';
  end if;
  select * into l from public.daily_report_lines where id = p_line for update;
  if not found then raise exception 'Zeile nicht gefunden.'; end if;
  select * into r from public.daily_reports where id = l.report_id;
  if r.status = 'approved' then raise exception 'Der Rapport ist bereits freigegeben.' using errcode = '22023'; end if;
  update public.daily_report_lines set resolution = p_action,
    notes = case when p_comment is not null then coalesce(notes || E'\n', '') || p_comment else notes end
  where id = p_line;
end;
$$;

create or replace function public.approve_daily_report(p_report uuid, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); r public.daily_reports; v_plan jsonb; v_blockers jsonb;
  p jsonb; l public.daily_report_lines; v_user uuid; v_entry uuid; v_id uuid;
  v_created integer := 0; v_already integer := 0; v_linked integer := 0; v_replaced integer := 0; v_skipped integer := 0;
  v_site text;
begin
  if not public.can_approve_hours(v_uid) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  select * into r from public.daily_reports where id = p_report for update;
  if not found then raise exception 'Rapport nicht gefunden.' using errcode = 'P0002'; end if;
  if r.status = 'approved' then
    return jsonb_build_object('approved', true, 'idempotent', true);
  end if;
  if r.status not in ('submitted', 'needs_review') then
    raise exception 'Rapport hat den Status % und kann nicht freigegeben werden.', r.status using errcode = '22023';
  end if;
  if r.duplicate_resolution = 'pending' then
    return jsonb_build_object('approved', false, 'blockers', jsonb_build_array(jsonb_build_object('reason', 'duplicate_pending')));
  end if;

  v_plan := public.report_approval_plan(p_report);
  if jsonb_array_length(v_plan) = 0 then
    return jsonb_build_object('approved', false, 'blockers', jsonb_build_array(jsonb_build_object('reason', 'no_lines')));
  end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_blockers from jsonb_array_elements(v_plan) x where x ->> 'action' = 'blocker';
  if jsonb_array_length(v_blockers) > 0 then
    return jsonb_build_object('approved', false, 'blockers', v_blockers);
  end if;

  if r.assignment_id is not null then
    select worksite_address into v_site from public.subcontract_assignments where id = r.assignment_id;
  else
    select location into v_site from public.projects where id = r.project_id;
  end if;

  for p in select * from jsonb_array_elements(v_plan) loop
    select * into l from public.daily_report_lines where id = (p ->> 'line_id')::uuid for update;
    if p ->> 'action' = 'already' then v_already := v_already + 1; continue; end if;
    if p ->> 'action' = 'skip' then v_skipped := v_skipped + 1; continue; end if;

    select u.id into v_user from public.users u where u.worker_id = l.worker_id and u.is_active limit 1;

    if p ->> 'action' = 'link' then
      v_entry := (p ->> 'conflict_entry_id')::uuid;
      update public.worker_time_entries set
        daily_report_id = coalesce(daily_report_id, r.id),
        daily_report_line_id = coalesce(daily_report_line_id, l.id),
        status = case when status = 'submitted' then 'approved' else status end
      where id = v_entry;
      update public.daily_report_lines set time_entry_id = v_entry where id = l.id;
      v_linked := v_linked + 1;
      continue;
    end if;

    if p ->> 'action' = 'replace' then
      v_entry := (p ->> 'conflict_entry_id')::uuid;
      update public.worker_time_entries set status = 'rejected',
        super_admin_comment = 'Ersetzt durch Tagesrapport ' || coalesce(r.document_number, r.id::text)
      where id = v_entry;
      v_replaced := v_replaced + 1;
    end if;

    insert into public.worker_time_entries (
      worker_user_id, worker_id, work_date, start_at, end_at, break_minutes, status, submitted_at,
      assignment_id, project_id, worksite, work_description, source, daily_report_id, daily_report_line_id,
      approved_by, approved_at)
    values (
      v_user, l.worker_id, r.report_date,
      (r.report_date + l.start_time) at time zone 'Europe/Zurich', (r.report_date + l.end_time) at time zone 'Europe/Zurich',
      l.break_minutes, 'approved', coalesce(r.submitted_at, now()),
      r.assignment_id, r.project_id, v_site,
      'Tagesrapport' || coalesce(' ' || r.document_number, ''),
      case when r.report_kind = 'group' then 'group_report' else 'photo_report' end,
      r.id, l.id, v_uid, now())
    returning id into v_id;
    update public.daily_report_lines set time_entry_id = v_id where id = l.id;
    v_created := v_created + 1;
    perform public.notify_user(v_user, 'hours_approved', 'Arbeitszeit freigegeben',
      'Aus dem Tagesrapport vom ' || to_char(r.report_date, 'DD.MM.YYYY') || ' wurde deine Arbeitszeit übernommen.',
      '/portal/stunden', jsonb_build_object('time_entry_id', v_id, 'report_id', r.id));
  end loop;

  update public.daily_reports set status = 'approved', reviewed_by = v_uid, reviewed_at = now(), review_comment = p_comment
  where id = p_report;
  perform public.notify_user(r.created_by, 'report_approved', 'Tagesrapport freigegeben',
    'Dein Rapport vom ' || to_char(r.report_date, 'DD.MM.YYYY') || ' wurde freigegeben.', '/portal/rapport',
    jsonb_build_object('report_id', p_report));

  return jsonb_build_object('approved', true, 'created', v_created, 'already', v_already, 'linked', v_linked,
                            'replaced', v_replaced, 'skipped', v_skipped);
end;
$$;

create or replace function public.reject_daily_report(p_report uuid, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.daily_reports;
begin
  if not public.can_approve_hours(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_comment, ''))) < 3 then raise exception 'Bitte einen Grund angeben.' using errcode = '22023'; end if;
  select * into r from public.daily_reports where id = p_report for update;
  if not found then raise exception 'Rapport nicht gefunden.'; end if;
  if r.status not in ('submitted', 'needs_review') then
    raise exception 'Nur eingereichte Rapporte können abgelehnt werden.' using errcode = '22023';
  end if;
  update public.daily_reports set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_comment = btrim(p_comment)
  where id = p_report;
  perform public.notify_user(r.created_by, 'report_rejected', 'Tagesrapport abgelehnt',
    'Dein Rapport vom ' || to_char(r.report_date, 'DD.MM.YYYY') || ' wurde abgelehnt: ' || btrim(p_comment), '/portal/rapport',
    jsonb_build_object('report_id', p_report));
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'create_daily_report(uuid,uuid,date,text,text)',
    'detect_report_duplicates(uuid)',
    'submit_daily_report(uuid)',
    'resolve_report_duplicate(uuid,text,text)',
    'report_approval_plan(uuid)',
    'preview_report_approval(uuid)',
    'resolve_report_line(uuid,text,text)',
    'approve_daily_report(uuid,text)',
    'reject_daily_report(uuid,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
-- report_approval_plan is an internal helper (it has no caller check): approvers only.
revoke execute on function public.report_approval_plan(uuid) from authenticated;

drop trigger if exists trg_audit_daily_reports on public.daily_reports;
create trigger trg_audit_daily_reports after insert or update or delete on public.daily_reports
for each row execute function public.log_audit_event();
drop trigger if exists trg_audit_daily_report_lines on public.daily_report_lines;
create trigger trg_audit_daily_report_lines after insert or update or delete on public.daily_report_lines
for each row execute function public.log_audit_event();
