-- V2 / 6: extended leave types, decision RPC with worker notification, conflict & calendar
-- queries, schedule conflict detection, optional leave balances.
-- The existing counter-offer flow (leave_requests columns / statuses) is preserved.

-- Allowed request types: legacy two + five new categories.
alter table public.leave_requests drop constraint if exists leave_requests_request_type_check;
alter table public.leave_requests add constraint leave_requests_request_type_check
  check (request_type in ('day_off', 'annual_leave', 'unpaid_leave', 'personal_day', 'sick_notification', 'other_absence'));

alter table public.leave_requests
  add column if not exists decided_by uuid references public.users(id) on delete set null,
  add column if not exists decided_at timestamptz;

-- Optional balance tracking: only for workers whose contract defines an entitlement.
create table if not exists public.worker_leave_config (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  track_balance boolean not null default false,
  annual_leave_days numeric(5,1) check (annual_leave_days is null or annual_leave_days >= 0),
  notes text,
  updated_at timestamptz not null default now()
);
alter table public.worker_leave_config enable row level security;
drop policy if exists leave_config_read on public.worker_leave_config;
create policy leave_config_read on public.worker_leave_config for select to authenticated
using (public.can_approve_hours(auth.uid()) or public.can_view_payroll(auth.uid()) or worker_id = public.current_worker_id());
drop policy if exists leave_config_write on public.worker_leave_config;
create policy leave_config_write on public.worker_leave_config for all to authenticated
using (public.can_edit_payroll(auth.uid())) with check (public.can_edit_payroll(auth.uid()));

-- Workers can read approvers' view of own requests already; admins (non-super) need read access too
-- (existing policy covers is_admin). Approval for approvers goes through decide_leave_request().

create or replace function public.leave_type_label(p text)
returns text language sql immutable as $$
  select case p
    when 'annual_leave' then 'Ferien' when 'unpaid_leave' then 'Unbezahlter Urlaub'
    when 'personal_day' then 'Persönlicher Freitag' when 'sick_notification' then 'Krankmeldung'
    when 'other_absence' then 'Andere Absenz' else 'Freier Tag' end;
$$;

create or replace function public.notify_leave_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_approvers('leave_requested', public.leave_type_label(new.request_type) || ' beantragt',
      to_char(new.requested_start_date, 'DD.MM.YYYY') || ' – ' || to_char(new.requested_end_date, 'DD.MM.YYYY'),
      '/admin/urlaub', jsonb_build_object('leave_request_id', new.id));
    return new;
  end if;
  if new.status is distinct from old.status and new.status in ('approved', 'rejected', 'counter_offered')
     and not (old.status = 'counter_offered' and new.status = 'approved') then
    perform public.notify_user(new.worker_user_id, 'leave_' || new.status,
      case new.status when 'approved' then 'Antrag genehmigt' when 'rejected' then 'Antrag abgelehnt' else 'Gegenvorschlag' end,
      public.leave_type_label(new.request_type) || ' ' || to_char(new.requested_start_date, 'DD.MM.YYYY') || ' – ' ||
        to_char(new.requested_end_date, 'DD.MM.YYYY') ||
        case when new.admin_comment is not null then ': ' || new.admin_comment else '' end,
      '/portal/urlaub', jsonb_build_object('leave_request_id', new.id));
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_leave_changes() from public, anon, authenticated;
drop trigger if exists trg_notify_leave_changes on public.leave_requests;
create trigger trg_notify_leave_changes after insert or update on public.leave_requests
for each row execute function public.notify_leave_changes();

create or replace function public.decide_leave_request(
  p_id uuid, p_decision text, p_comment text default null, p_counter_start date default null, p_counter_end date default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.leave_requests;
begin
  if not public.can_approve_hours(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject', 'counter_offer') then raise exception 'Ungültige Entscheidung.' using errcode = '22023'; end if;
  select * into r from public.leave_requests where id = p_id for update;
  if not found then raise exception 'Antrag nicht gefunden.' using errcode = 'P0002'; end if;
  if r.status not in ('pending', 'worker_countered') then
    raise exception 'Dieser Antrag wurde bereits entschieden (Status %).', r.status using errcode = '22023';
  end if;
  if p_decision = 'reject' and length(btrim(coalesce(p_comment, ''))) < 3 then
    raise exception 'Bitte einen Ablehnungsgrund angeben.' using errcode = '22023';
  end if;
  if p_decision = 'counter_offer' and (p_counter_start is null or p_counter_end is null or p_counter_end < p_counter_start) then
    raise exception 'Bitte einen gültigen Gegenvorschlag angeben.' using errcode = '22023';
  end if;
  update public.leave_requests set
    status = case p_decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'counter_offered' end,
    admin_comment = nullif(btrim(coalesce(p_comment, '')), ''),
    admin_counter_start_date = case when p_decision = 'counter_offer' then p_counter_start else null end,
    admin_counter_end_date = case when p_decision = 'counter_offer' then p_counter_end else null end,
    decided_by = auth.uid(), decided_at = now()
  where id = p_id;
end;
$$;

create or replace function public.leave_conflicts(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.leave_requests; v_wid uuid; v_s date; v_e date; v_out jsonb;
begin
  if not (public.can_approve_hours(auth.uid()) or public.is_staff(auth.uid())) then
    raise exception 'Keine Berechtigung.' using errcode = '42501';
  end if;
  select * into r from public.leave_requests where id = p_id;
  if not found then return null; end if;
  v_wid := r.worker_id; v_s := r.requested_start_date; v_e := r.requested_end_date;

  select jsonb_build_object(
    'other_absences', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'worker', w.full_name,
        'type', l.request_type, 'status', l.status, 'start', l.requested_start_date, 'end', l.requested_end_date)), '[]'::jsonb)
      from public.leave_requests l left join public.workers w on w.id = l.worker_id
      where l.id <> r.id and l.status in ('pending', 'approved', 'counter_offered', 'worker_countered')
        and l.requested_start_date <= v_e and l.requested_end_date >= v_s),
    'assignments', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'number', a.assignment_number,
        'client', c.company_name, 'start', a.start_date, 'end', a.end_date)), '[]'::jsonb)
      from public.assignment_workers aw
      join public.subcontract_assignments a on a.id = aw.assignment_id and a.status in ('planned', 'active')
      join public.clients c on c.id = a.client_id
      where aw.worker_id = v_wid and a.start_date <= v_e and coalesce(a.end_date, 'infinity'::date) >= v_s),
    'team_plans', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'date', t.plan_date)), '[]'::jsonb)
      from public.team_plans t
      where v_wid = any (t.worker_ids) and t.status <> 'cancelled' and t.plan_date between v_s and v_e),
    'teammates_absent', (select count(distinct l.worker_id)
      from public.leave_requests l
      join public.assignment_workers aw2 on aw2.worker_id = l.worker_id
      where l.id <> r.id and l.status = 'approved' and l.requested_start_date <= v_e and l.requested_end_date >= v_s
        and aw2.assignment_id in (select assignment_id from public.assignment_workers where worker_id = v_wid))
  ) into v_out;
  return v_out;
end;
$$;

create or replace function public.company_calendar(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'leaves', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'worker_id', l.worker_id, 'worker', w.full_name,
        'type', l.request_type, 'status', l.status, 'start', l.requested_start_date, 'end', l.requested_end_date)), '[]'::jsonb)
      from public.leave_requests l left join public.workers w on w.id = l.worker_id
      where l.status in ('pending', 'approved', 'counter_offered', 'worker_countered')
        and l.requested_start_date <= p_to and l.requested_end_date >= p_from),
    'assignments', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'number', a.assignment_number, 'client', c.company_name,
        'address', a.worksite_address, 'start', a.start_date, 'end', a.end_date, 'status', a.status,
        'worker_ids', (select coalesce(jsonb_agg(aw.worker_id), '[]'::jsonb) from public.assignment_workers aw where aw.assignment_id = a.id))), '[]'::jsonb)
      from public.subcontract_assignments a join public.clients c on c.id = a.client_id
      where a.status in ('planned', 'active', 'completed') and a.start_date <= p_to and coalesce(a.end_date, 'infinity'::date) >= p_from),
    'plans', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'date', t.plan_date, 'location', t.location,
        'worker_ids', t.worker_ids, 'vehicle', t.vehicle_label, 'status', t.status)), '[]'::jsonb)
      from public.team_plans t where t.plan_date between p_from and p_to and t.status <> 'cancelled')
  );
end;
$$;

-- Schedule conflicts across team plans, assignments and approved absences.
create or replace function public.schedule_conflicts(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb := '[]'::jsonb; x record;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;

  for x in
    select t1.plan_date, w.full_name, t1.id as a_id, t1.title as a_title, t2.id as b_id, t2.title as b_title
    from public.team_plans t1
    join public.team_plans t2 on t2.plan_date = t1.plan_date and t2.id > t1.id and t2.status <> 'cancelled'
    cross join lateral unnest(t1.worker_ids) wid
    join public.workers w on w.id = wid
    where t1.status <> 'cancelled' and t1.plan_date between p_from and p_to and wid = any (t2.worker_ids)
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'double_booked_worker', 'date', x.plan_date,
      'detail', x.full_name || ' ist doppelt eingeplant: ' || x.a_title || ' / ' || x.b_title,
      'plan_ids', jsonb_build_array(x.a_id, x.b_id)));
  end loop;

  for x in
    select t.plan_date, w.full_name, t.id as plan_id, t.title, l.request_type
    from public.team_plans t
    cross join lateral unnest(t.worker_ids) wid
    join public.workers w on w.id = wid
    join public.leave_requests l on l.worker_id = wid and l.status = 'approved'
         and t.plan_date between l.requested_start_date and l.requested_end_date
    where t.status <> 'cancelled' and t.plan_date between p_from and p_to
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'worker_absent', 'date', x.plan_date,
      'detail', x.full_name || ' ist abwesend (' || public.leave_type_label(x.request_type) || ') und trotzdem eingeplant: ' || x.title,
      'plan_ids', jsonb_build_array(x.plan_id)));
  end loop;

  for x in
    select t1.plan_date, t1.vehicle_label, t1.id as a_id, t1.title as a_title, t2.id as b_id, t2.title as b_title
    from public.team_plans t1
    join public.team_plans t2 on t2.plan_date = t1.plan_date and t2.id > t1.id and t2.status <> 'cancelled'
      and lower(btrim(t2.vehicle_label)) = lower(btrim(t1.vehicle_label))
    where t1.status <> 'cancelled' and coalesce(btrim(t1.vehicle_label), '') <> '' and t1.plan_date between p_from and p_to
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'vehicle_double_booked', 'date', x.plan_date,
      'detail', 'Fahrzeug "' || x.vehicle_label || '" ist doppelt eingeplant: ' || x.a_title || ' / ' || x.b_title,
      'plan_ids', jsonb_build_array(x.a_id, x.b_id)));
  end loop;

  for x in
    select a.id, a.assignment_number, w.full_name, l.requested_start_date s, l.requested_end_date e, l.request_type
    from public.assignment_workers aw
    join public.subcontract_assignments a on a.id = aw.assignment_id and a.status in ('planned', 'active')
    join public.workers w on w.id = aw.worker_id
    join public.leave_requests l on l.worker_id = aw.worker_id and l.status = 'approved'
         and l.requested_start_date <= least(p_to, coalesce(a.end_date, 'infinity'::date))
         and l.requested_end_date >= greatest(p_from, a.start_date)
    where a.start_date <= p_to and coalesce(a.end_date, 'infinity'::date) >= p_from
  loop
    v := v || jsonb_build_array(jsonb_build_object('type', 'assignment_absence', 'date', x.s,
      'detail', x.full_name || ' ist vom ' || to_char(x.s, 'DD.MM.') || ' bis ' || to_char(x.e, 'DD.MM.YYYY') ||
                ' abwesend, Auftrag ' || x.assignment_number || ' ist zugeteilt',
      'assignment_id', x.id));
  end loop;
  return v;
end;
$$;

-- Used leave days (Mon–Fri) in a calendar year: only for annual leave and only where tracking is configured.
create or replace function public.leave_balance(p_worker uuid, p_year integer)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.worker_leave_config; v_used numeric;
begin
  if not (public.can_approve_hours(auth.uid()) or public.can_view_payroll(auth.uid()) or p_worker = public.current_worker_id()) then
    raise exception 'Keine Berechtigung.' using errcode = '42501';
  end if;
  select * into c from public.worker_leave_config where worker_id = p_worker;
  if not found or not c.track_balance then
    return jsonb_build_object('tracked', false);
  end if;
  select coalesce(sum((
    select count(*) from generate_series(greatest(l.requested_start_date, make_date(p_year, 1, 1)),
                                         least(l.requested_end_date, make_date(p_year, 12, 31)), interval '1 day') d
    where extract(isodow from d) <= 5)), 0) into v_used
  from public.leave_requests l
  where l.worker_id = p_worker and l.request_type = 'annual_leave' and l.status = 'approved'
    and l.requested_start_date <= make_date(p_year, 12, 31) and l.requested_end_date >= make_date(p_year, 1, 1);
  return jsonb_build_object('tracked', true, 'entitlement', c.annual_leave_days, 'used', v_used,
                            'remaining', case when c.annual_leave_days is null then null else c.annual_leave_days - v_used end);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'decide_leave_request(uuid,text,text,date,date)',
    'leave_conflicts(uuid)', 'company_calendar(date,date)', 'schedule_conflicts(date,date)', 'leave_balance(uuid,integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
