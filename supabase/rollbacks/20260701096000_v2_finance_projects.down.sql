-- Rollback of V2/7. Restores the previous anon grants on projects (full table select, still RLS-filtered).
drop function if exists public.finance_inputs(date, date);
grant select on public.projects to anon;
-- Extended Apex project columns hold new data only. Dropping them discards that data.
alter table public.projects
  drop column if exists surface_area_m2, drop column if exists budget_amount, drop column if exists rental_start_date,
  drop column if exists rental_end_date, drop column if exists montage_amount, drop column if exists demontage_amount,
  drop column if exists transport_amount, drop column if exists rental_amount, drop column if exists safety_notes;
