-- V2 / 7: finance input RPC (money as text; no float round trips), extended Apex project fields,
-- and column-level protection of project financials from anonymous website visitors.

-- ---------------------------------------------------------------------------
-- Apex-owned project extension (all nullable; existing rows untouched)
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists surface_area_m2 numeric(12,2) check (surface_area_m2 is null or surface_area_m2 >= 0),
  add column if not exists budget_amount numeric(12,2) check (budget_amount is null or budget_amount >= 0),
  add column if not exists rental_start_date date,
  add column if not exists rental_end_date date,
  add column if not exists montage_amount numeric(12,2) check (montage_amount is null or montage_amount >= 0),
  add column if not exists demontage_amount numeric(12,2) check (demontage_amount is null or demontage_amount >= 0),
  add column if not exists transport_amount numeric(12,2) check (transport_amount is null or transport_amount >= 0),
  add column if not exists rental_amount numeric(12,2) check (rental_amount is null or rental_amount >= 0),
  add column if not exists safety_notes text;

-- ---------------------------------------------------------------------------
-- Anonymous visitors may only read the columns the public website renders.
-- (Previously anon could select revenue / worker_cost / extra_expense of public projects.)
-- Column list is built from information_schema so it also works on databases that lack optional columns.
-- ---------------------------------------------------------------------------
do $$
declare v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'projects'
    and column_name in ('id', 'project_name', 'description', 'location', 'start_date', 'end_date',
                        'status', 'progress', 'created_at', 'is_public', 'deleted_at', 'project_number');
  revoke select on public.projects from anon;
  execute format('grant select (%s) on public.projects to anon', v_cols);
end $$;

-- ---------------------------------------------------------------------------
-- Finance inputs: raw, per-entry facts. All arithmetic happens in the decimal library / SQL numeric.
-- ---------------------------------------------------------------------------
create or replace function public.finance_inputs(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_from date := date_trunc('month', p_from)::date; v_to date := (date_trunc('month', p_to) + interval '1 month')::date;
begin
  if not public.can_view_payroll(auth.uid()) then raise exception 'Keine Berechtigung.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to_exclusive', v_to),
    'entries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'work_date', e.work_date, 'status', e.status, 'worker_id', e.worker_id, 'worker', w.full_name,
        'assignment_id', e.assignment_id, 'assignment_number', a.assignment_number,
        'client_id', a.client_id, 'client', c.company_name,
        'project_id', e.project_id, 'project', p.project_name,
        'worked_minutes', e.worked_minutes, 'approved_minutes', e.approved_minutes, 'billable_minutes', e.billable_minutes,
        'billing_rate', e.billing_rate::text, 'is_saturday', e.is_saturday,
        'projected_rate', case when e.assignment_id is not null and e.billing_rate is null
                               then public.resolve_billing_rate(e.assignment_id, e.work_date)::text end,
        'saturday_amount', sp.amount::text, 'saturday_rate', sp.hourly_rate::text, 'saturday_minutes', sp.minutes,
        'saturday_status', sp.status) order by e.work_date, e.start_at), '[]'::jsonb)
      from public.worker_time_entries e
      join public.workers w on w.id = e.worker_id
      left join public.subcontract_assignments a on a.id = e.assignment_id
      left join public.clients c on c.id = a.client_id
      left join public.projects p on p.id = e.project_id
      left join public.saturday_payments sp on sp.time_entry_id = e.id
      where e.work_date >= v_from and e.work_date < v_to and e.status in ('submitted', 'approved') and e.end_at is not null),
    'salaries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'worker_id', cfg.worker_id, 'monthly_gross_salary', cfg.monthly_gross_salary::text,
        'employer_cost_percent', cfg.employer_cost_percent::text,
        'employer_cost_applies_to_saturday', cfg.employer_cost_applies_to_saturday,
        'reference_hours', cfg.monthly_reference_hours::text, 'is_active', cfg.is_active)), '[]'::jsonb)
      from public.worker_salary_config cfg),
    'monthly_salaries', (
      select coalesce(jsonb_agg(jsonb_build_object('worker_id', ms.worker_id, 'month', ms.salary_month,
        'gross_salary', ms.gross_salary::text)), '[]'::jsonb)
      from public.worker_monthly_salaries ms where ms.salary_month >= v_from and ms.salary_month < v_to),
    'expenses', (
      select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'assignment_id', x.assignment_id, 'worker_id', x.worker_id,
        'date', x.expense_date, 'category', x.category, 'amount', x.amount::text, 'description', x.description,
        'client_id', a2.client_id, 'client', c2.company_name, 'assignment_number', a2.assignment_number)), '[]'::jsonb)
      from public.assignment_expenses x
      join public.subcontract_assignments a2 on a2.id = x.assignment_id
      join public.clients c2 on c2.id = a2.client_id
      where x.expense_date >= v_from and x.expense_date < v_to)
  );
end;
$$;
revoke execute on function public.finance_inputs(date, date) from public, anon;
grant execute on function public.finance_inputs(date, date) to authenticated;

-- Unterakkord-visible subset for non-payroll managers is intentionally not provided:
-- revenue and margins are confidential (super_admin / admin / finance only).
