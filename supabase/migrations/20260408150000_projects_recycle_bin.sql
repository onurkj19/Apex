-- Soft delete për projektet: Recycle Bin + pastrim i përhershëm pas 10 ditësh.

alter table public.projects add column if not exists deleted_at timestamptz;
alter table public.projects add column if not exists deleted_by uuid references public.users(id) on delete set null;

create index if not exists idx_projects_deleted_at on public.projects (deleted_at) where deleted_at is not null;

-- Statistikat e dashboard-it: mos numëro projektet e fshira (soft).
create or replace view public.v_dashboard_stats as
select
  (select count(*) from public.projects where deleted_at is null) as total_projects,
  (select count(*) from public.projects where status = 'Ne pune' and deleted_at is null) as active_projects,
  (select count(*) from public.projects where status = 'I perfunduar' and deleted_at is null) as completed_projects,
  coalesce((select sum(case when finance_type = 'income' then amount else 0 end) from public.finances where date_trunc('month', finance_date) = date_trunc('month', now())), 0) as monthly_revenue,
  coalesce((select sum(case when finance_type = 'expense' then amount else 0 end) from public.finances where date_trunc('month', finance_date) = date_trunc('month', now())), 0) as monthly_expenses,
  coalesce((select sum(case when finance_type = 'income' then amount else -amount end) from public.finances), 0) as company_balance;

-- Website publik: mos shfaq projekte të fshira.
drop policy if exists anon_read_website_projects on public.projects;
create policy anon_read_website_projects on public.projects for select to anon
using (
  status in ('I pranuar', 'Ne pune', 'I perfunduar')
  and deleted_at is null
);

-- Panel jo-admin: lexo vetëm projektet aktive.
drop policy if exists public_read_projects on public.projects;
create policy public_read_projects on public.projects for select to authenticated
using (public.can_read_panel(auth.uid()) and deleted_at is null);
