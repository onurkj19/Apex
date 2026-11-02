-- V2 / 3: Unterakkord assignments, billing terms, shared time-entry source of truth,
-- overlap protection, approval workflow RPCs, per-user notifications.
-- Additive only. Existing rows of worker_time_entries keep working unchanged
-- (all new columns are nullable or defaulted; legacy rows have source = 'timer').

-- ---------------------------------------------------------------------------
-- Per-user notifications (existing `notifications` table is global / admin-only)
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_notifications_user on public.user_notifications (user_id, created_at desc);
alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_own_read on public.user_notifications;
create policy user_notifications_own_read on public.user_notifications for select to authenticated
using (user_id = auth.uid());
drop policy if exists user_notifications_own_update on public.user_notifications;
create policy user_notifications_own_update on public.user_notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Clients may only flip read_at; rows are created exclusively by SECURITY DEFINER functions.
revoke insert, delete, update on public.user_notifications from authenticated, anon;
grant update (read_at) on public.user_notifications to authenticated;

create or replace function public.notify_user(p_user uuid, p_type text, p_title text, p_message text,
                                              p_link text default null, p_meta jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.user_notifications (user_id, type, title, message, link, metadata)
  values (p_user, p_type, p_title, p_message, p_link, coalesce(p_meta, '{}'::jsonb));
$$;
revoke execute on function public.notify_user(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.notify_approvers(p_type text, p_title text, p_message text,
                                                   p_link text default null, p_meta jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.user_notifications (user_id, type, title, message, link, metadata)
  select u.id, p_type, p_title, p_message, p_link, coalesce(p_meta, '{}'::jsonb)
  from public.users u where u.is_active and u.role in ('super_admin', 'admin', 'project_manager');
$$;
revoke execute on function public.notify_approvers(text, text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Client billing terms (default 46 CHF; configurable per client and per assignment)
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists is_unterakkord_client boolean not null default false,
  add column if not exists billing_hourly_rate numeric(10,2) check (billing_hourly_rate is null or billing_hourly_rate >= 0),
  add column if not exists billing_saturday_rate numeric(10,2) check (billing_saturday_rate is null or billing_saturday_rate >= 0);

insert into public.app_settings (setting_key, setting_value)
values ('billing_defaults', '{"hourly_rate": "46.00", "saturday_rate": null, "currency": "CHF"}'::jsonb)
on conflict (setting_key) do nothing;

insert into public.app_settings (setting_key, setting_value)
values ('payroll_defaults', '{"monthly_reference_hours": "182", "saturday_hourly_rate": "30.00", "currency": "CHF"}'::jsonb)
on conflict (setting_key) do nothing;

-- ---------------------------------------------------------------------------
-- Subcontracting assignments
-- ---------------------------------------------------------------------------
create table if not exists public.subcontract_assignments (
  id uuid primary key default uuid_generate_v4(),
  assignment_number text not null check (length(btrim(assignment_number)) > 0),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text,
  worksite_address text not null,
  team_leader_worker_id uuid references public.workers(id) on delete set null,
  start_date date not null,
  end_date date,
  planned_daily_minutes integer check (planned_daily_minutes is null or planned_daily_minutes between 1 and 960),
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index if not exists uq_assignment_number_per_client
  on public.subcontract_assignments (client_id, lower(btrim(assignment_number)));
create index if not exists idx_assignments_dates on public.subcontract_assignments (start_date, end_date);

-- Money lives apart so workers who may read the assignment never see billing data.
create table if not exists public.assignment_billing (
  assignment_id uuid primary key references public.subcontract_assignments(id) on delete cascade,
  hourly_rate numeric(10,2) check (hourly_rate is null or hourly_rate >= 0),
  saturday_rate numeric(10,2) check (saturday_rate is null or saturday_rate >= 0),
  billing_status text not null default 'open'
    check (billing_status in ('open', 'ready_to_bill', 'invoiced', 'paid', 'disputed')),
  invoice_reference text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.assignment_workers (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.subcontract_assignments(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete restrict,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  unique (assignment_id, worker_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index if not exists idx_assignment_workers_worker on public.assignment_workers (worker_id);

create table if not exists public.assignment_expenses (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.subcontract_assignments(id) on delete restrict,
  worker_id uuid references public.workers(id) on delete set null,
  expense_date date not null,
  category text not null default 'other' check (category in ('transport', 'material', 'accommodation', 'other')),
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_assignment_expenses_assignment on public.assignment_expenses (assignment_id, expense_date);

drop trigger if exists trg_subcontract_assignments_updated_at on public.subcontract_assignments;
create trigger trg_subcontract_assignments_updated_at before update on public.subcontract_assignments
for each row execute function public.set_updated_at();
drop trigger if exists trg_assignment_billing_updated_at on public.assignment_billing;
create trigger trg_assignment_billing_updated_at before update on public.assignment_billing
for each row execute function public.set_updated_at();

create or replace function public.ensure_assignment_billing_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.assignment_billing (assignment_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists trg_assignment_billing_row on public.subcontract_assignments;
create trigger trg_assignment_billing_row after insert on public.subcontract_assignments
for each row execute function public.ensure_assignment_billing_row();

-- ---------------------------------------------------------------------------
-- worker_time_entries: shared time-entry source of truth (additive columns)
-- ---------------------------------------------------------------------------
alter table public.worker_time_entries
  add column if not exists assignment_id uuid references public.subcontract_assignments(id) on delete restrict,
  add column if not exists project_id uuid references public.projects(id) on delete restrict,
  add column if not exists worksite text,
  add column if not exists work_description text,
  add column if not exists comment text,
  add column if not exists source text not null default 'timer',
  add column if not exists daily_report_id uuid,
  add column if not exists daily_report_line_id uuid,
  add column if not exists approved_minutes integer check (approved_minutes is null or approved_minutes >= 0),
  add column if not exists billable_minutes integer check (billable_minutes is null or billable_minutes >= 0),
  add column if not exists billing_rate numeric(10,2) check (billing_rate is null or billing_rate >= 0),
  add column if not exists is_saturday boolean generated always as (extract(isodow from work_date) = 6) stored;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'wte_source_check') then
    alter table public.worker_time_entries
      add constraint wte_source_check check (source in ('timer', 'manual', 'photo_report', 'group_report', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wte_single_target_check') then
    alter table public.worker_time_entries
      add constraint wte_single_target_check check (num_nonnulls(assignment_id, project_id) <= 1);
  end if;
end $$;

create unique index if not exists uq_wte_report_line on public.worker_time_entries (daily_report_line_id)
  where daily_report_line_id is not null;
create index if not exists idx_wte_user_date on public.worker_time_entries (worker_user_id, work_date);
create index if not exists idx_wte_worker_date on public.worker_time_entries (worker_id, work_date);
create index if not exists idx_wte_assignment on public.worker_time_entries (assignment_id) where assignment_id is not null;
create index if not exists idx_wte_project on public.worker_time_entries (project_id) where project_id is not null;

-- ---------------------------------------------------------------------------
-- Billing rate resolution: assignment -> client -> global default -> 46.00
-- Saturday: assignment sat -> client sat -> global sat -> same as the weekday rate.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_billing_rate(p_assignment_id uuid, p_date date)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_week numeric; v_sat numeric;
  v_def_week numeric; v_def_sat numeric;
begin
  select nullif(setting_value ->> 'hourly_rate', '')::numeric, nullif(setting_value ->> 'saturday_rate', '')::numeric
    into v_def_week, v_def_sat
  from public.app_settings where setting_key = 'billing_defaults';

  select coalesce(ab.hourly_rate, c.billing_hourly_rate, v_def_week, 46.00),
         coalesce(ab.saturday_rate, c.billing_saturday_rate, v_def_sat)
    into v_week, v_sat
  from public.subcontract_assignments a
  join public.clients c on c.id = a.client_id
  left join public.assignment_billing ab on ab.assignment_id = a.id
  where a.id = p_assignment_id;

  if v_week is null then v_week := coalesce(v_def_week, 46.00); end if;
  if extract(isodow from p_date) = 6 then return coalesce(v_sat, v_week); end if;
  return v_week;
end;
$$;
revoke execute on function public.resolve_billing_rate(uuid, date) from public, anon;
grant execute on function public.resolve_billing_rate(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Worker can work on an assignment on a date?
-- ---------------------------------------------------------------------------
create or replace function public.worker_on_assignment(p_worker uuid, p_assignment uuid, p_date date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.assignment_workers aw
    join public.subcontract_assignments a on a.id = aw.assignment_id
    where aw.assignment_id = p_assignment and aw.worker_id = p_worker
      and a.status <> 'cancelled'
      and p_date >= coalesce(aw.valid_from, a.start_date)
      and p_date <= coalesce(aw.valid_to, a.end_date, 'infinity'::date)
  );
$$;
revoke execute on function public.worker_on_assignment(uuid, uuid, date) from public, anon;
grant execute on function public.worker_on_assignment(uuid, uuid, date) to authenticated;

create or replace function public.worker_on_project(p_worker uuid, p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_workers pw where pw.project_id = p_project and pw.worker_id = p_worker);
$$;
revoke execute on function public.worker_on_project(uuid, uuid) from public, anon;
grant execute on function public.worker_on_project(uuid, uuid) to authenticated;

create or replace function public.leads_assignment(p_assignment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subcontract_assignments a
    where a.id = p_assignment and a.team_leader_worker_id is not null
      and a.team_leader_worker_id = public.current_worker_id()
  );
$$;
revoke execute on function public.leads_assignment(uuid) from public, anon;
grant execute on function public.leads_assignment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Integrity trigger for worker_time_entries
-- ---------------------------------------------------------------------------
create or replace function public.time_entry_integrity()
returns trigger language plpgsql as $$
declare
  v_client boolean := current_user in ('authenticated', 'anon');
  v_uid uuid := auth.uid();
  v_gross integer;
  v_conflict uuid;
  v_wid uuid;
begin
  -- Hours of non-timer entries are always computed here: end - start - break.
  if new.source <> 'timer' and new.end_at is not null then
    if new.end_at <= new.start_at then
      raise exception 'Die Endzeit muss nach der Startzeit liegen.' using errcode = '22023';
    end if;
    if (new.start_at at time zone 'Europe/Zurich')::date <> (new.end_at at time zone 'Europe/Zurich')::date then
      raise exception 'Ein Zeiteintrag darf nicht über Mitternacht gehen.' using errcode = '22023';
    end if;
    new.work_date := (new.start_at at time zone 'Europe/Zurich')::date;
    v_gross := floor(extract(epoch from (new.end_at - new.start_at)) / 60)::integer;
    if new.break_minutes < 0 or new.break_minutes >= v_gross then
      raise exception 'Die Pause muss kürzer als die Anwesenheit sein.' using errcode = '22023';
    end if;
    new.worked_minutes := v_gross - new.break_minutes;
    if new.worked_minutes > 960 then
      raise exception 'Mehr als 16 Stunden pro Eintrag sind nicht zulässig.' using errcode = '22023';
    end if;
  end if;

  if v_client then
    if tg_op = 'INSERT' then
      if v_uid is null or new.worker_user_id <> v_uid then
        raise exception 'Zeiteinträge können nur für das eigene Konto erstellt werden.' using errcode = '42501';
      end if;
      if new.status not in ('running', 'submitted')
         or new.source not in ('timer', 'manual')
         or new.approved_by is not null or new.approved_at is not null
         or new.approved_minutes is not null or new.billable_minutes is not null or new.billing_rate is not null
         or new.daily_report_id is not null or new.daily_report_line_id is not null then
        raise exception 'Freigabe-Felder dürfen nicht direkt gesetzt werden.' using errcode = '42501';
      end if;
      v_wid := public.current_worker_id();
      if new.assignment_id is not null and not public.worker_on_assignment(v_wid, new.assignment_id, new.work_date) then
        raise exception 'Du bist diesem Auftrag an diesem Datum nicht zugeteilt.' using errcode = '42501';
      end if;
      if new.project_id is not null and not public.worker_on_project(v_wid, new.project_id) then
        raise exception 'Du bist diesem Projekt nicht zugeteilt.' using errcode = '42501';
      end if;
    elsif not public.can_approve_hours(v_uid) then
      if old.worker_user_id <> v_uid or new.worker_user_id <> old.worker_user_id then
        raise exception 'Nur eigene Zeiteinträge sind änderbar.' using errcode = '42501';
      end if;
      if not (old.status = 'running' and new.status in ('running', 'submitted')) then
        raise exception 'Dieser Zeiteintrag kann nicht mehr direkt geändert werden.' using errcode = '42501';
      end if;
      if new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at
         or new.approved_minutes is distinct from old.approved_minutes
         or new.billable_minutes is distinct from old.billable_minutes
         or new.billing_rate is distinct from old.billing_rate
         or new.super_admin_comment is distinct from old.super_admin_comment
         or new.source is distinct from old.source
         or new.assignment_id is distinct from old.assignment_id
         or new.project_id is distinct from old.project_id
         or new.daily_report_id is distinct from old.daily_report_id
         or new.daily_report_line_id is distinct from old.daily_report_line_id then
        raise exception 'Freigabe-Felder dürfen nicht direkt gesetzt werden.' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Approval snapshot: approved / billable minutes and billing rate are fixed on approval.
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    if new.end_at is null then
      raise exception 'Laufende Einträge können nicht freigegeben werden.' using errcode = '22023';
    end if;
    new.approved_minutes := coalesce(new.approved_minutes, new.worked_minutes);
    if new.assignment_id is not null then
      new.billable_minutes := coalesce(new.billable_minutes, new.approved_minutes);
      new.billing_rate := coalesce(new.billing_rate, public.resolve_billing_rate(new.assignment_id, new.work_date));
    end if;
    new.approved_by := coalesce(new.approved_by, v_uid);
    new.approved_at := coalesce(new.approved_at, now());
  elsif tg_op = 'UPDATE' and old.status = 'approved' and new.status <> 'approved' then
    new.approved_minutes := null;
    new.billable_minutes := null;
    new.billing_rate := null;
    new.approved_by := null;
    new.approved_at := null;
  end if;

  -- Overlap protection (serialised per worker so two concurrent submissions cannot both pass).
  if new.status <> 'rejected'
     and (tg_op = 'INSERT'
          or new.start_at is distinct from old.start_at
          or new.end_at is distinct from old.end_at
          or new.worker_user_id is distinct from old.worker_user_id
          or old.status = 'rejected') then
    perform pg_advisory_xact_lock(hashtextextended('wte:' || new.worker_user_id::text, 0));
    select e.id into v_conflict
    from public.worker_time_entries e
    where e.worker_user_id = new.worker_user_id
      and e.id <> new.id
      and e.status <> 'rejected'
      and tstzrange(e.start_at, coalesce(e.end_at, e.start_at + interval '1 minute'), '[)')
          && tstzrange(new.start_at, coalesce(new.end_at, new.start_at + interval '1 minute'), '[)')
    limit 1;
    if v_conflict is not null then
      raise exception 'Überschneidung mit bestehendem Zeiteintrag (%).', v_conflict using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_time_entry_integrity on public.worker_time_entries;
create trigger trg_time_entry_integrity
before insert or update on public.worker_time_entries
for each row execute function public.time_entry_integrity();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.subcontract_assignments enable row level security;
alter table public.assignment_billing enable row level security;
alter table public.assignment_workers enable row level security;
alter table public.assignment_expenses enable row level security;

drop policy if exists assignments_staff_read on public.subcontract_assignments;
create policy assignments_staff_read on public.subcontract_assignments for select to authenticated
using (public.is_staff(auth.uid()));
drop policy if exists assignments_member_read on public.subcontract_assignments;
create policy assignments_member_read on public.subcontract_assignments for select to authenticated
using (team_leader_worker_id = public.current_worker_id()
       or exists (select 1 from public.assignment_workers aw
                  where aw.assignment_id = subcontract_assignments.id
                    and aw.worker_id = public.current_worker_id()));
drop policy if exists assignments_manage on public.subcontract_assignments;
create policy assignments_manage on public.subcontract_assignments for all to authenticated
using (public.can_approve_hours(auth.uid())) with check (public.can_approve_hours(auth.uid()));

drop policy if exists assignment_billing_payroll_read on public.assignment_billing;
create policy assignment_billing_payroll_read on public.assignment_billing for select to authenticated
using (public.is_staff(auth.uid()));
drop policy if exists assignment_billing_manage on public.assignment_billing;
create policy assignment_billing_manage on public.assignment_billing for all to authenticated
using (public.can_view_payroll(auth.uid())) with check (public.can_view_payroll(auth.uid()));

drop policy if exists assignment_workers_staff_read on public.assignment_workers;
create policy assignment_workers_staff_read on public.assignment_workers for select to authenticated
using (public.is_staff(auth.uid()));
drop policy if exists assignment_workers_own_read on public.assignment_workers;
create policy assignment_workers_own_read on public.assignment_workers for select to authenticated
using (worker_id = public.current_worker_id());
drop policy if exists assignment_workers_manage on public.assignment_workers;
create policy assignment_workers_manage on public.assignment_workers for all to authenticated
using (public.can_approve_hours(auth.uid())) with check (public.can_approve_hours(auth.uid()));

drop policy if exists assignment_expenses_read on public.assignment_expenses;
create policy assignment_expenses_read on public.assignment_expenses for select to authenticated
using (public.can_view_payroll(auth.uid()) or public.can_approve_hours(auth.uid()));
drop policy if exists assignment_expenses_manage on public.assignment_expenses;
create policy assignment_expenses_manage on public.assignment_expenses for all to authenticated
using (public.can_view_payroll(auth.uid())) with check (public.can_view_payroll(auth.uid()));

-- worker_time_entries: staff and team leaders may read; approvers may update.
drop policy if exists time_staff_read on public.worker_time_entries;
create policy time_staff_read on public.worker_time_entries for select to authenticated
using (public.is_staff(auth.uid()));
drop policy if exists time_leader_read on public.worker_time_entries;
create policy time_leader_read on public.worker_time_entries for select to authenticated
using (assignment_id is not null and public.leads_assignment(assignment_id));
drop policy if exists time_approver_update on public.worker_time_entries;
create policy time_approver_update on public.worker_time_entries for update to authenticated
using (public.can_approve_hours(auth.uid())) with check (public.can_approve_hours(auth.uid()));

-- ---------------------------------------------------------------------------
-- Worker RPCs (SECURITY DEFINER; authorisation is checked inside)
-- ---------------------------------------------------------------------------
create or replace function public.submit_time_entry(
  p_date date, p_start time, p_end time, p_break_minutes integer,
  p_assignment_id uuid, p_project_id uuid,
  p_worksite text, p_description text, p_comment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_wid uuid;
  v_id uuid;
  v_site text := nullif(btrim(coalesce(p_worksite, '')), '');
begin
  if v_uid is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  select worker_id into v_wid from public.users where id = v_uid and is_active;
  if not found then raise exception 'Konto ist nicht aktiv.' using errcode = '42501'; end if;
  if v_wid is null then raise exception 'Dein Konto ist keinem Mitarbeiter zugeordnet.' using errcode = '42501'; end if;
  if num_nonnulls(p_assignment_id, p_project_id) <> 1 then
    raise exception 'Bitte genau einen Auftrag oder ein Projekt wählen.' using errcode = '22023';
  end if;
  if p_date is null or p_start is null or p_end is null then
    raise exception 'Datum, Start- und Endzeit sind Pflichtfelder.' using errcode = '22023';
  end if;
  if p_date > (now() at time zone 'Europe/Zurich')::date + 1 then
    raise exception 'Zeiten dürfen nicht weit in der Zukunft liegen.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_description, ''))) < 3 then
    raise exception 'Bitte eine kurze Arbeitsbeschreibung angeben.' using errcode = '22023';
  end if;
  if p_assignment_id is not null then
    if not public.worker_on_assignment(v_wid, p_assignment_id, p_date) then
      raise exception 'Du bist diesem Auftrag an diesem Datum nicht zugeteilt.' using errcode = '42501';
    end if;
    if v_site is null then select worksite_address into v_site from public.subcontract_assignments where id = p_assignment_id; end if;
  else
    if not public.worker_on_project(v_wid, p_project_id) then
      raise exception 'Du bist diesem Projekt nicht zugeteilt.' using errcode = '42501';
    end if;
    if v_site is null then select location into v_site from public.projects where id = p_project_id; end if;
  end if;

  insert into public.worker_time_entries (
    worker_user_id, worker_id, work_date, start_at, end_at, break_minutes, status, submitted_at,
    assignment_id, project_id, worksite, work_description, comment, source)
  values (
    v_uid, v_wid, p_date,
    (p_date + p_start) at time zone 'Europe/Zurich',
    (p_date + p_end) at time zone 'Europe/Zurich',
    coalesce(p_break_minutes, 0), 'submitted', now(),
    p_assignment_id, p_project_id, v_site, btrim(p_description), nullif(btrim(coalesce(p_comment, '')), ''), 'manual')
  returning id into v_id;

  perform public.notify_approvers('hours_submitted', 'Neue Arbeitszeit eingereicht',
    'Ein Mitarbeiter hat Arbeitszeit zur Freigabe eingereicht.', '/admin/stunden', jsonb_build_object('time_entry_id', v_id));
  return v_id;
end;
$$;

create or replace function public.update_my_time_entry(
  p_id uuid, p_start time, p_end time, p_break_minutes integer, p_worksite text, p_description text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.worker_time_entries;
begin
  select * into v_row from public.worker_time_entries where id = p_id for update;
  if not found or v_row.worker_user_id is distinct from v_uid then
    raise exception 'Zeiteintrag nicht gefunden.' using errcode = '42501';
  end if;
  if v_row.source <> 'manual' or v_row.status not in ('submitted', 'rejected') then
    raise exception 'Nur eingereichte oder abgelehnte manuelle Einträge können bearbeitet werden.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_description, ''))) < 3 then
    raise exception 'Bitte eine kurze Arbeitsbeschreibung angeben.' using errcode = '22023';
  end if;
  update public.worker_time_entries set
    start_at = (v_row.work_date + p_start) at time zone 'Europe/Zurich',
    end_at = (v_row.work_date + p_end) at time zone 'Europe/Zurich',
    break_minutes = coalesce(p_break_minutes, 0),
    worksite = coalesce(nullif(btrim(coalesce(p_worksite, '')), ''), worksite),
    work_description = btrim(p_description),
    comment = nullif(btrim(coalesce(p_comment, '')), ''),
    status = 'submitted', submitted_at = now(), super_admin_comment = null
  where id = p_id;
end;
$$;

create or replace function public.delete_my_time_entry(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row public.worker_time_entries;
begin
  select * into v_row from public.worker_time_entries where id = p_id for update;
  if not found or v_row.worker_user_id is distinct from auth.uid() then
    raise exception 'Zeiteintrag nicht gefunden.' using errcode = '42501';
  end if;
  if v_row.source <> 'manual' or v_row.status not in ('submitted', 'rejected') then
    raise exception 'Freigegebene Einträge können nicht gelöscht werden.' using errcode = '42501';
  end if;
  delete from public.worker_time_entries where id = p_id;
end;
$$;

-- Approvers -----------------------------------------------------------------
create or replace function public.approve_time_entries(p_ids uuid[], p_comment text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n integer := 0; r public.worker_time_entries;
begin
  if not public.can_approve_hours(v_uid) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  for r in select * from public.worker_time_entries where id = any (p_ids) order by id for update loop
    if r.status <> 'submitted' then
      raise exception 'Eintrag % hat den Status % und kann nicht freigegeben werden.', r.id, r.status using errcode = '22023';
    end if;
    update public.worker_time_entries set status = 'approved', approved_by = v_uid, approved_at = now(),
      super_admin_comment = coalesce(nullif(btrim(coalesce(p_comment, '')), ''), super_admin_comment)
    where id = r.id;
    perform public.notify_user(r.worker_user_id, 'hours_approved', 'Arbeitszeit freigegeben',
      'Deine Arbeitszeit vom ' || to_char(r.work_date, 'DD.MM.YYYY') || ' wurde freigegeben.', '/portal/stunden',
      jsonb_build_object('time_entry_id', r.id));
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.reject_time_entries(p_ids uuid[], p_comment text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n integer := 0; r public.worker_time_entries;
begin
  if not public.can_approve_hours(v_uid) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_comment, ''))) < 3 then
    raise exception 'Bitte einen Ablehnungsgrund angeben.' using errcode = '22023';
  end if;
  for r in select * from public.worker_time_entries where id = any (p_ids) order by id for update loop
    if r.status not in ('submitted', 'approved') then
      raise exception 'Eintrag % kann nicht abgelehnt werden (Status %).', r.id, r.status using errcode = '22023';
    end if;
    update public.worker_time_entries set status = 'rejected', super_admin_comment = btrim(p_comment) where id = r.id;
    perform public.notify_user(r.worker_user_id, 'hours_rejected', 'Arbeitszeit abgelehnt',
      'Deine Arbeitszeit vom ' || to_char(r.work_date, 'DD.MM.YYYY') || ' wurde abgelehnt: ' || btrim(p_comment), '/portal/stunden',
      jsonb_build_object('time_entry_id', r.id));
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Adjust approved (payroll) and billable (invoice) minutes separately. Reason is mandatory.
create or replace function public.adjust_time_entry_minutes(
  p_id uuid, p_approved_minutes integer, p_billable_minutes integer, p_billing_rate numeric, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.worker_time_entries;
begin
  if not public.can_approve_hours(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Bitte eine Begründung angeben.' using errcode = '22023'; end if;
  select * into r from public.worker_time_entries where id = p_id for update;
  if not found then raise exception 'Zeiteintrag nicht gefunden.'; end if;
  if r.status <> 'approved' then raise exception 'Nur freigegebene Einträge können angepasst werden.' using errcode = '22023'; end if;
  if p_approved_minutes is not null and (p_approved_minutes < 0 or p_approved_minutes > r.worked_minutes) then
    raise exception 'Freigegebene Minuten müssen zwischen 0 und den erfassten Minuten liegen.' using errcode = '22023';
  end if;
  update public.worker_time_entries set
    approved_minutes = coalesce(p_approved_minutes, approved_minutes),
    billable_minutes = case when assignment_id is null then billable_minutes else coalesce(p_billable_minutes, billable_minutes) end,
    billing_rate = case when assignment_id is null then billing_rate else coalesce(p_billing_rate, billing_rate) end,
    super_admin_comment = btrim(p_reason)
  where id = p_id;
end;
$$;

-- Admin entry on behalf of a worker (e.g. missing report). Status is approved immediately.
create or replace function public.admin_create_time_entry(
  p_worker_id uuid, p_date date, p_start time, p_end time, p_break_minutes integer,
  p_assignment_id uuid, p_project_id uuid, p_worksite text, p_description text, p_comment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_user uuid; v_id uuid; v_site text := nullif(btrim(coalesce(p_worksite, '')), '');
begin
  if not public.can_approve_hours(v_uid) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  select id into v_user from public.users where worker_id = p_worker_id and is_active limit 1;
  if v_user is null then raise exception 'Der Mitarbeiter hat kein aktives Benutzerkonto.' using errcode = '22023'; end if;
  if num_nonnulls(p_assignment_id, p_project_id) <> 1 then
    raise exception 'Bitte genau einen Auftrag oder ein Projekt wählen.' using errcode = '22023';
  end if;
  if v_site is null and p_assignment_id is not null then
    select worksite_address into v_site from public.subcontract_assignments where id = p_assignment_id;
  elsif v_site is null then
    select location into v_site from public.projects where id = p_project_id;
  end if;
  insert into public.worker_time_entries (
    worker_user_id, worker_id, work_date, start_at, end_at, break_minutes, status, submitted_at,
    assignment_id, project_id, worksite, work_description, comment, source, approved_by, approved_at)
  values (
    v_user, p_worker_id, p_date, (p_date + p_start) at time zone 'Europe/Zurich', (p_date + p_end) at time zone 'Europe/Zurich',
    coalesce(p_break_minutes, 0), 'approved', now(), p_assignment_id, p_project_id, v_site,
    btrim(coalesce(p_description, 'Nacherfassung durch Verwaltung')), p_comment, 'admin', v_uid, now())
  returning id into v_id;
  return v_id;
end;
$$;

-- Worker overview of own worksites for a date (names of team mates only, no money)
create or replace function public.my_worksites(p_date date default (now() at time zone 'Europe/Zurich')::date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_wid uuid := public.current_worker_id(); v_out jsonb;
begin
  if auth.uid() is null or v_wid is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x order by x ->> 'name'), '[]'::jsonb) into v_out from (
    select jsonb_build_object(
      'kind', 'assignment', 'id', a.id, 'name', c.company_name, 'assignment_number', a.assignment_number,
      'address', a.worksite_address, 'start_date', a.start_date, 'end_date', a.end_date,
      'planned_daily_minutes', a.planned_daily_minutes,
      'team_leader', (select w.full_name from public.workers w where w.id = a.team_leader_worker_id),
      'is_team_leader', a.team_leader_worker_id = v_wid,
      'team', (select coalesce(jsonb_agg(jsonb_build_object('worker_id', w.id, 'name', w.full_name) order by w.full_name), '[]'::jsonb)
               from public.assignment_workers aw2 join public.workers w on w.id = aw2.worker_id
               where aw2.assignment_id = a.id
                 and p_date >= coalesce(aw2.valid_from, a.start_date)
                 and p_date <= coalesce(aw2.valid_to, a.end_date, 'infinity'::date))
    ) as x
    from public.subcontract_assignments a
    join public.clients c on c.id = a.client_id
    where a.status <> 'cancelled'
      and (public.worker_on_assignment(v_wid, a.id, p_date) or a.team_leader_worker_id = v_wid)
      and p_date >= a.start_date and p_date <= coalesce(a.end_date, 'infinity'::date)
    union all
    select jsonb_build_object(
      'kind', 'project', 'id', p.id, 'name', p.project_name, 'assignment_number', p.project_number::text,
      'address', p.location, 'start_date', p.start_date, 'end_date', p.end_date, 'planned_daily_minutes', null,
      'team_leader', null, 'is_team_leader', false, 'team', '[]'::jsonb)
    from public.projects p
    join public.project_workers pw on pw.project_id = p.id and pw.worker_id = v_wid
    where p.deleted_at is null and p.status = 'Ne pune'
  ) q;
  return v_out;
end;
$$;

-- All assignments/projects the worker may report on (any date), for dropdowns.
create or replace function public.my_reportable_targets()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_wid uuid := public.current_worker_id(); v_out jsonb;
begin
  if auth.uid() is null or v_wid is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x order by x ->> 'label'), '[]'::jsonb) into v_out from (
    select jsonb_build_object('kind', 'assignment', 'id', a.id,
      'label', c.company_name || ' · ' || a.assignment_number, 'address', a.worksite_address,
      'start_date', a.start_date, 'end_date', a.end_date,
      'is_team_leader', a.team_leader_worker_id = v_wid) as x
    from public.subcontract_assignments a join public.clients c on c.id = a.client_id
    where a.status in ('planned', 'active', 'completed')
      and (exists (select 1 from public.assignment_workers aw where aw.assignment_id = a.id and aw.worker_id = v_wid)
           or a.team_leader_worker_id = v_wid)
    union all
    select jsonb_build_object('kind', 'project', 'id', p.id, 'label', 'Apex · ' || p.project_name,
      'address', p.location, 'start_date', p.start_date, 'end_date', p.end_date, 'is_team_leader', false)
    from public.projects p join public.project_workers pw on pw.project_id = p.id and pw.worker_id = v_wid
    where p.deleted_at is null
  ) q;
  return v_out;
end;
$$;

-- Execute grants: only authenticated users may call the client RPCs.
do $$
declare f text;
begin
  foreach f in array array[
    'submit_time_entry(date,time,time,integer,uuid,uuid,text,text,text)',
    'update_my_time_entry(uuid,time,time,integer,text,text,text)',
    'delete_my_time_entry(uuid)',
    'approve_time_entries(uuid[],text)',
    'reject_time_entries(uuid[],text)',
    'adjust_time_entry_minutes(uuid,integer,integer,numeric,text)',
    'admin_create_time_entry(uuid,date,time,time,integer,uuid,uuid,text,text,text)',
    'my_worksites(date)',
    'my_reportable_targets()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Audit trail for the new operational tables (no money-sensitive payroll data here).
drop trigger if exists trg_audit_subcontract_assignments on public.subcontract_assignments;
create trigger trg_audit_subcontract_assignments after insert or update or delete on public.subcontract_assignments
for each row execute function public.log_audit_event();
drop trigger if exists trg_audit_assignment_workers on public.assignment_workers;
create trigger trg_audit_assignment_workers after insert or update or delete on public.assignment_workers
for each row execute function public.log_audit_event();
