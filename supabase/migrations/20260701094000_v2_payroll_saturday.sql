-- V2 / 5: salary configuration (payroll roles only), Saturday work register,
-- cash payment receipts, immutable payment history and a dedicated payroll audit log.
-- Payroll data is deliberately NOT attached to the generic audit_logs trigger because audit_logs
-- is readable by every panel role.

-- ---------------------------------------------------------------------------
-- Payroll audit log
-- ---------------------------------------------------------------------------
create table if not exists public.payroll_audit_log (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id text,
  operation text not null,
  actor uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_payroll_audit_record on public.payroll_audit_log (table_name, record_id, created_at desc);
alter table public.payroll_audit_log enable row level security;
drop policy if exists payroll_audit_read on public.payroll_audit_log;
create policy payroll_audit_read on public.payroll_audit_log for select to authenticated
using (public.can_view_payroll(auth.uid()));
revoke insert, update, delete on public.payroll_audit_log from authenticated, anon;

drop trigger if exists trg_payroll_audit_immutable on public.payroll_audit_log;
create trigger trg_payroll_audit_immutable before update or delete on public.payroll_audit_log
for each row execute function public.block_mutation();

create or replace function public.log_payroll_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor uuid;
begin
  begin v_actor := auth.uid(); exception when others then v_actor := null; end;
  if tg_op = 'INSERT' then
    insert into public.payroll_audit_log (table_name, record_id, operation, actor, new_data)
    values (tg_table_name, new.id::text, tg_op, v_actor, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.payroll_audit_log (table_name, record_id, operation, actor, old_data, new_data)
    values (tg_table_name, new.id::text, tg_op, v_actor, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.payroll_audit_log (table_name, record_id, operation, actor, old_data)
    values (tg_table_name, old.id::text, tg_op, v_actor, to_jsonb(old));
    return old;
  end if;
end;
$$;
revoke execute on function public.log_payroll_audit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Salary configuration
-- ---------------------------------------------------------------------------
create table if not exists public.worker_salary_config (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null unique references public.workers(id) on delete restrict,
  -- Never defaulted or invented: stays NULL until an administrator enters the contractual amount.
  monthly_gross_salary numeric(12,2) check (monthly_gross_salary is null or monthly_gross_salary >= 0),
  contract_type text not null default 'monthly_fixed' check (contract_type in ('monthly_fixed', 'hourly', 'other')),
  monthly_reference_hours numeric(6,2) not null default 182 check (monthly_reference_hours > 0),
  saturday_hourly_rate numeric(10,2) not null default 30.00 check (saturday_hourly_rate >= 0),
  saturday_payroll_classification text not null default 'saturday_supplement'
    check (saturday_payroll_classification in ('saturday_supplement', 'regular_hours', 'overtime_reviewed', 'other_reviewed')),
  employer_cost_percent numeric(5,2) check (employer_cost_percent is null or employer_cost_percent between 0 and 100),
  employer_cost_applies_to_saturday boolean not null default true,
  employment_start_date date,
  is_active boolean not null default true,
  notes text,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Actual salary for a given month, entered manually by an administrator.
create table if not exists public.worker_monthly_salaries (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  salary_month date not null check (salary_month = date_trunc('month', salary_month)::date),
  gross_salary numeric(12,2) not null check (gross_salary >= 0),
  notes text,
  entered_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (worker_id, salary_month)
);

alter table public.worker_salary_config enable row level security;
alter table public.worker_monthly_salaries enable row level security;
drop policy if exists salary_config_read on public.worker_salary_config;
create policy salary_config_read on public.worker_salary_config for select to authenticated
using (public.can_view_payroll(auth.uid()));
drop policy if exists salary_config_write on public.worker_salary_config;
create policy salary_config_write on public.worker_salary_config for all to authenticated
using (public.can_edit_payroll(auth.uid())) with check (public.can_edit_payroll(auth.uid()));
drop policy if exists monthly_salary_read on public.worker_monthly_salaries;
create policy monthly_salary_read on public.worker_monthly_salaries for select to authenticated
using (public.can_view_payroll(auth.uid()));
drop policy if exists monthly_salary_write on public.worker_monthly_salaries;
create policy monthly_salary_write on public.worker_monthly_salaries for all to authenticated
using (public.can_edit_payroll(auth.uid())) with check (public.can_edit_payroll(auth.uid()));

drop trigger if exists trg_salary_config_updated_at on public.worker_salary_config;
create trigger trg_salary_config_updated_at before update on public.worker_salary_config
for each row execute function public.set_updated_at();
drop trigger if exists trg_monthly_salaries_updated_at on public.worker_monthly_salaries;
create trigger trg_monthly_salaries_updated_at before update on public.worker_monthly_salaries
for each row execute function public.set_updated_at();
drop trigger if exists trg_payroll_audit_salary_config on public.worker_salary_config;
create trigger trg_payroll_audit_salary_config after insert or update or delete on public.worker_salary_config
for each row execute function public.log_payroll_audit();
drop trigger if exists trg_payroll_audit_monthly_salaries on public.worker_monthly_salaries;
create trigger trg_payroll_audit_monthly_salaries after insert or update or delete on public.worker_monthly_salaries
for each row execute function public.log_payroll_audit();

create or replace function public.stamp_updated_by()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  return new;
end;
$$;
drop trigger if exists trg_salary_config_updated_by on public.worker_salary_config;
create trigger trg_salary_config_updated_by before insert or update on public.worker_salary_config
for each row execute function public.stamp_updated_by();

create or replace function public.stamp_entered_by()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.entered_by := auth.uid(); end if;
  return new;
end;
$$;
drop trigger if exists trg_monthly_salaries_entered_by on public.worker_monthly_salaries;
create trigger trg_monthly_salaries_entered_by before insert or update on public.worker_monthly_salaries
for each row execute function public.stamp_entered_by();

-- ---------------------------------------------------------------------------
-- Saturday register
-- ---------------------------------------------------------------------------
create sequence if not exists public.cash_receipt_seq;

create table if not exists public.cash_receipts (
  id uuid primary key default uuid_generate_v4(),
  receipt_number text not null unique,
  worker_id uuid not null references public.workers(id) on delete restrict,
  total_minutes integer not null check (total_minutes >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payment_date date not null,
  payment_method text not null check (payment_method in ('cash', 'bank', 'other')),
  payment_reference text,
  idempotency_key text unique,
  issued_by uuid references public.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_via text check (confirmed_via is null or confirmed_via in ('portal', 'paper')),
  confirmed_by uuid references public.users(id) on delete set null,
  confirmed_name text,
  notes text
);

create table if not exists public.saturday_payments (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  time_entry_id uuid not null unique references public.worker_time_entries(id) on delete restrict,
  work_date date not null,
  assignment_id uuid references public.subcontract_assignments(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  minutes integer not null check (minutes >= 0),
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  amount numeric(12,2) not null,
  payroll_classification text not null default 'saturday_supplement'
    check (payroll_classification in ('saturday_supplement', 'regular_hours', 'overtime_reviewed', 'other_reviewed')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'unpaid', 'paid')),
  payment_date date,
  payment_method text check (payment_method is null or payment_method in ('cash', 'bank', 'other')),
  payment_reference text,
  receipt_id uuid references public.cash_receipts(id) on delete restrict,
  paid_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saturday_paid_consistency check (
    (status = 'paid' and payment_date is not null and payment_method is not null and receipt_id is not null)
    or (status <> 'paid' and payment_date is null and receipt_id is null))
);
create index if not exists idx_saturday_payments_worker on public.saturday_payments (worker_id, work_date);
create index if not exists idx_saturday_payments_status on public.saturday_payments (status);

create table if not exists public.saturday_payment_events (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references public.saturday_payments(id) on delete restrict,
  action text not null,
  actor uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_saturday_events_payment on public.saturday_payment_events (payment_id, created_at);
drop trigger if exists trg_saturday_events_immutable on public.saturday_payment_events;
create trigger trg_saturday_events_immutable before update or delete on public.saturday_payment_events
for each row execute function public.block_mutation();

-- amount = round(minutes * rate / 60, 2) in exact decimal arithmetic
create or replace function public.saturday_payment_calc()
returns trigger language plpgsql as $$
begin
  new.amount := round((new.minutes::numeric * new.hourly_rate) / 60, 2);
  return new;
end;
$$;
drop trigger if exists trg_saturday_payment_calc on public.saturday_payments;
create trigger trg_saturday_payment_calc before insert or update on public.saturday_payments
for each row execute function public.saturday_payment_calc();
drop trigger if exists trg_saturday_payments_updated_at on public.saturday_payments;
create trigger trg_saturday_payments_updated_at before update on public.saturday_payments
for each row execute function public.set_updated_at();

-- paid rows are final: no delete, no change of the money fields
create or replace function public.saturday_payment_protect()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'paid' then
      raise exception 'Bezahlte Samstagszahlungen können nicht gelöscht werden.' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.status = 'paid' and (new.minutes is distinct from old.minutes or new.hourly_rate is distinct from old.hourly_rate
      or new.status is distinct from old.status or new.worker_id is distinct from old.worker_id
      or new.payment_date is distinct from old.payment_date or new.receipt_id is distinct from old.receipt_id
      or new.payroll_classification is distinct from old.payroll_classification) then
    raise exception 'Bezahlte Samstagszahlungen sind unveränderlich.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_saturday_payment_protect on public.saturday_payments;
create trigger trg_saturday_payment_protect before update or delete on public.saturday_payments
for each row execute function public.saturday_payment_protect();

drop trigger if exists trg_payroll_audit_saturday_payments on public.saturday_payments;
create trigger trg_payroll_audit_saturday_payments after insert or update or delete on public.saturday_payments
for each row execute function public.log_payroll_audit();
drop trigger if exists trg_payroll_audit_cash_receipts on public.cash_receipts;
create trigger trg_payroll_audit_cash_receipts after insert or update or delete on public.cash_receipts
for each row execute function public.log_payroll_audit();

alter table public.saturday_payments enable row level security;
alter table public.saturday_payment_events enable row level security;
alter table public.cash_receipts enable row level security;

drop policy if exists saturday_read on public.saturday_payments;
create policy saturday_read on public.saturday_payments for select to authenticated
using (public.can_view_payroll(auth.uid()) or worker_id = public.current_worker_id());
drop policy if exists saturday_events_read on public.saturday_payment_events;
create policy saturday_events_read on public.saturday_payment_events for select to authenticated
using (public.can_view_payroll(auth.uid()));
drop policy if exists receipts_read on public.cash_receipts;
create policy receipts_read on public.cash_receipts for select to authenticated
using (public.can_view_payroll(auth.uid()) or worker_id = public.current_worker_id());
revoke insert, update, delete on public.saturday_payments, public.saturday_payment_events, public.cash_receipts
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Keep the register in sync with time entries (only exact, never double: unique(time_entry_id))
-- ---------------------------------------------------------------------------
create or replace function public.sync_saturday_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pay public.saturday_payments;
  v_minutes integer;
  v_rate numeric; v_class text;
  v_def_rate numeric;
  v_status text;
begin
  select * into v_pay from public.saturday_payments where time_entry_id = new.id for update;

  if new.is_saturday is not true or new.worker_id is null or new.end_at is null
     or new.status not in ('submitted', 'approved') then
    if v_pay.id is not null then
      if v_pay.status = 'paid' then
        raise exception 'Für diesen Eintrag wurde die Samstagszahlung bereits ausbezahlt (%). Änderung nicht möglich.',
          v_pay.id using errcode = '42501';
      end if;
      insert into public.saturday_payment_events (payment_id, action, actor, details)
        values (v_pay.id, 'removed', auth.uid(), jsonb_build_object('reason', 'time_entry_' || new.status));
      delete from public.saturday_payments where id = v_pay.id;
    end if;
    return new;
  end if;

  v_minutes := case when new.status = 'approved' then coalesce(new.approved_minutes, new.worked_minutes) else new.worked_minutes end;
  v_status := case when new.status = 'approved' then 'approved' else 'pending' end;

  if v_pay.id is null then
    select c.saturday_hourly_rate, c.saturday_payroll_classification into v_rate, v_class
      from public.worker_salary_config c where c.worker_id = new.worker_id;
    if v_rate is null then
      select nullif(setting_value ->> 'saturday_hourly_rate', '')::numeric into v_def_rate
        from public.app_settings where setting_key = 'payroll_defaults';
      v_rate := coalesce(v_def_rate, 30.00);
    end if;
    insert into public.saturday_payments (worker_id, time_entry_id, work_date, assignment_id, project_id, minutes,
                                          hourly_rate, payroll_classification, status)
    values (new.worker_id, new.id, new.work_date, new.assignment_id, new.project_id, v_minutes, v_rate,
            coalesce(v_class, 'saturday_supplement'), v_status)
    returning * into v_pay;
    insert into public.saturday_payment_events (payment_id, action, actor, details)
      values (v_pay.id, 'created', auth.uid(), jsonb_build_object('minutes', v_minutes, 'hourly_rate', v_rate, 'amount', v_pay.amount));
  else
    if v_pay.status = 'paid' then
      if v_minutes is distinct from v_pay.minutes or new.work_date is distinct from v_pay.work_date or v_status <> 'approved' then
        raise exception 'Für diesen Eintrag wurde die Samstagszahlung bereits ausbezahlt (%). Änderung nicht möglich.',
          v_pay.id using errcode = '42501';
      end if;
      return new;
    end if;
    if v_minutes is distinct from v_pay.minutes or new.work_date is distinct from v_pay.work_date
       or new.assignment_id is distinct from v_pay.assignment_id or new.project_id is distinct from v_pay.project_id
       or (v_status = 'pending' and v_pay.status <> 'pending') or (v_status = 'approved' and v_pay.status = 'pending') then
      update public.saturday_payments set
        minutes = v_minutes, work_date = new.work_date, assignment_id = new.assignment_id, project_id = new.project_id,
        status = case when v_status = 'pending' then 'pending' when status = 'pending' then 'approved' else status end
      where id = v_pay.id returning * into v_pay;
      insert into public.saturday_payment_events (payment_id, action, actor, details)
        values (v_pay.id, 'synced', auth.uid(), jsonb_build_object('minutes', v_minutes, 'status', v_pay.status, 'amount', v_pay.amount));
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_saturday_payment() from public, anon, authenticated;

drop trigger if exists trg_sync_saturday_payment on public.worker_time_entries;
create trigger trg_sync_saturday_payment after insert or update on public.worker_time_entries
for each row execute function public.sync_saturday_payment();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.set_saturday_payment_status(p_ids uuid[], p_status text, p_note text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare r public.saturday_payments; v_n integer := 0;
begin
  if not public.can_pay_saturday(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if p_status not in ('approved', 'unpaid') then raise exception 'Ungültiger Status.' using errcode = '22023'; end if;
  for r in select * from public.saturday_payments where id = any (p_ids) order by id for update loop
    if r.status = 'paid' then raise exception 'Zahlung % ist bereits bezahlt.', r.id using errcode = '22023'; end if;
    if r.status = 'pending' then raise exception 'Zahlung % wartet noch auf die Freigabe der Stunden.', r.id using errcode = '22023'; end if;
    update public.saturday_payments set status = p_status, notes = coalesce(p_note, notes) where id = r.id;
    insert into public.saturday_payment_events (payment_id, action, actor, details)
      values (r.id, 'status_' || p_status, auth.uid(), jsonb_build_object('note', p_note));
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.update_saturday_payment_rate(p_id uuid, p_rate numeric, p_classification text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.saturday_payments;
begin
  if not public.can_edit_payroll(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Bitte eine Begründung angeben.' using errcode = '22023'; end if;
  if p_rate is null or p_rate < 0 then raise exception 'Ungültiger Stundensatz.' using errcode = '22023'; end if;
  select * into r from public.saturday_payments where id = p_id for update;
  if not found then raise exception 'Zahlung nicht gefunden.'; end if;
  if r.status = 'paid' then raise exception 'Bezahlte Zahlungen sind unveränderlich.' using errcode = '22023'; end if;
  update public.saturday_payments set hourly_rate = p_rate,
    payroll_classification = coalesce(p_classification, payroll_classification) where id = p_id;
  insert into public.saturday_payment_events (payment_id, action, actor, details)
    values (p_id, 'rate_changed', auth.uid(), jsonb_build_object('old_rate', r.hourly_rate, 'new_rate', p_rate, 'reason', p_reason));
end;
$$;

create or replace function public.mark_saturday_paid(
  p_ids uuid[], p_payment_date date, p_method text default 'cash',
  p_reference text default null, p_idempotency_key text default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_ids uuid[]; v_rows public.saturday_payments[]; r public.saturday_payments;
  v_worker uuid; v_minutes integer := 0; v_amount numeric := 0; v_receipt uuid; v_number text;
begin
  if not public.can_pay_saturday(v_uid) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  if p_idempotency_key is not null then
    select id into v_receipt from public.cash_receipts where idempotency_key = p_idempotency_key;
    if found then return v_receipt; end if;
  end if;
  if p_method not in ('cash', 'bank', 'other') then raise exception 'Ungültige Zahlungsart.' using errcode = '22023'; end if;
  if p_payment_date is null or p_payment_date > (now() at time zone 'Europe/Zurich')::date then
    raise exception 'Das Zahlungsdatum darf nicht in der Zukunft liegen.' using errcode = '22023';
  end if;
  select array_agg(distinct x) into v_ids from unnest(p_ids) x;
  if v_ids is null or array_length(v_ids, 1) = 0 then raise exception 'Keine Zahlungen ausgewählt.' using errcode = '22023'; end if;

  for r in select * from public.saturday_payments where id = any (v_ids) order by id for update loop
    v_rows := v_rows || r;
  end loop;
  if coalesce(array_length(v_rows, 1), 0) <> array_length(v_ids, 1) then
    raise exception 'Mindestens eine Zahlung wurde nicht gefunden.' using errcode = '22023';
  end if;
  foreach r in array v_rows loop
    if r.status = 'paid' then raise exception 'Zahlung % wurde bereits ausbezahlt.', r.id using errcode = '22023'; end if;
    if r.status = 'pending' then raise exception 'Zahlung % ist noch nicht freigegeben.', r.id using errcode = '22023'; end if;
    if v_worker is null then v_worker := r.worker_id;
    elsif v_worker <> r.worker_id then
      raise exception 'Eine Quittung kann nur für einen Mitarbeiter ausgestellt werden.' using errcode = '22023';
    end if;
    v_minutes := v_minutes + r.minutes;
    v_amount := v_amount + r.amount;
  end loop;

  v_number := 'BQ-' || to_char(p_payment_date, 'YYYY') || '-' || lpad(nextval('public.cash_receipt_seq')::text, 5, '0');
  insert into public.cash_receipts (receipt_number, worker_id, total_minutes, total_amount, payment_date, payment_method,
                                    payment_reference, idempotency_key, issued_by, notes)
  values (v_number, v_worker, v_minutes, v_amount, p_payment_date, p_method, nullif(btrim(coalesce(p_reference, '')), ''),
          p_idempotency_key, v_uid, p_notes)
  returning id into v_receipt;

  update public.saturday_payments set status = 'paid', payment_date = p_payment_date, payment_method = p_method,
    payment_reference = nullif(btrim(coalesce(p_reference, '')), ''), receipt_id = v_receipt, paid_by = v_uid
  where id = any (v_ids);
  insert into public.saturday_payment_events (payment_id, action, actor, details)
  select x, 'paid', v_uid, jsonb_build_object('receipt_id', v_receipt, 'receipt_number', v_number, 'method', p_method)
  from unnest(v_ids) x;

  perform public.notify_user(u.id, 'saturday_paid', 'Samstagszahlung ausbezahlt',
    'Quittung ' || v_number || ': CHF ' || to_char(v_amount, 'FM999G999G990D00') || ' – bitte den Empfang bestätigen.',
    '/portal/stunden', jsonb_build_object('receipt_id', v_receipt))
  from public.users u where u.worker_id = v_worker and u.is_active;
  return v_receipt;
end;
$$;

create or replace function public.confirm_cash_receipt(p_receipt uuid, p_confirmed_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.cash_receipts; v_uid uuid := auth.uid(); v_via text; v_name text;
begin
  select * into r from public.cash_receipts where id = p_receipt for update;
  if not found then raise exception 'Quittung nicht gefunden.' using errcode = 'P0002'; end if;
  if r.worker_id is not distinct from public.current_worker_id() then
    v_via := 'portal';
    select full_name into v_name from public.users where id = v_uid;
  elsif public.can_pay_saturday(v_uid) then
    v_via := 'paper';
    v_name := nullif(btrim(coalesce(p_confirmed_name, '')), '');
    if v_name is null then raise exception 'Bitte den Namen auf der unterschriebenen Quittung angeben.' using errcode = '22023'; end if;
  else
    raise exception 'Keine Berechtigung.' using errcode = '42501';
  end if;
  if r.confirmed_at is not null then return; end if;
  update public.cash_receipts set confirmed_at = now(), confirmed_via = v_via, confirmed_by = v_uid, confirmed_name = v_name
  where id = p_receipt;
  insert into public.saturday_payment_events (payment_id, action, actor, details)
  select sp.id, 'receipt_confirmed', v_uid, jsonb_build_object('receipt_id', p_receipt, 'via', v_via)
  from public.saturday_payments sp where sp.receipt_id = p_receipt;
end;
$$;

-- Worker's own month overview. Exposes the reference hours but never any salary figure.
create or replace function public.my_month_overview(p_month date default (now() at time zone 'Europe/Zurich')::date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_wid uuid := public.current_worker_id(); v_first date := date_trunc('month', p_month)::date;
  v_ref numeric; v_out jsonb;
begin
  if auth.uid() is null or v_wid is null then return null; end if;
  select monthly_reference_hours into v_ref from public.worker_salary_config where worker_id = v_wid;
  if v_ref is null then
    select nullif(setting_value ->> 'monthly_reference_hours', '')::numeric into v_ref
      from public.app_settings where setting_key = 'payroll_defaults';
  end if;
  select jsonb_build_object(
    'month', to_char(v_first, 'YYYY-MM'),
    'reference_minutes', round(coalesce(v_ref, 182) * 60),
    'approved_minutes', coalesce(sum(coalesce(approved_minutes, worked_minutes)) filter (where status = 'approved'), 0),
    'submitted_minutes', coalesce(sum(worked_minutes) filter (where status = 'submitted'), 0),
    'rejected_minutes', coalesce(sum(worked_minutes) filter (where status = 'rejected'), 0),
    'saturday_approved_minutes', coalesce(sum(coalesce(approved_minutes, worked_minutes)) filter (where status = 'approved' and is_saturday), 0),
    'saturday_submitted_minutes', coalesce(sum(worked_minutes) filter (where status = 'submitted' and is_saturday), 0),
    'entries', count(*)
  ) into v_out
  from public.worker_time_entries
  where worker_user_id = auth.uid() and work_date >= v_first and work_date < (v_first + interval '1 month')::date
    and end_at is not null;
  return v_out;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'set_saturday_payment_status(uuid[],text,text)',
    'update_saturday_payment_rate(uuid,numeric,text,text)',
    'mark_saturday_paid(uuid[],date,text,text,text,text)',
    'confirm_cash_receipt(uuid,text)',
    'my_month_overview(date)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
