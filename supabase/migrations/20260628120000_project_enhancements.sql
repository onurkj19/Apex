-- ============================================================
-- Migration: project_number, priority, project_files,
--            project_issues, material_requests
-- Run this in: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Add project_number (auto-generated sequential per creation)
alter table public.projects
  add column if not exists project_number serial;

-- 2. Add priority
do $$ begin
  if not exists (select 1 from pg_type where typname = 'project_priority') then
    create type public.project_priority as enum ('Low', 'Medium', 'High', 'Urgent');
  end if;
end $$;

alter table public.projects
  add column if not exists priority public.project_priority not null default 'Medium';

-- 3. project_files — multi-type attachments per project
create table if not exists public.project_files (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  file_name   text not null,
  file_url    text not null,
  file_path   text,
  file_type   text not null default 'other', -- 'image','video','pdf','plan','safety','other'
  file_size   bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.project_files enable row level security;

drop policy if exists admin_all_project_files on public.project_files;
create policy admin_all_project_files on public.project_files for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists read_project_files_panel on public.project_files;
create policy read_project_files_panel on public.project_files for select to authenticated
  using (public.can_read_panel(auth.uid()));

-- 4. project_issues — worker issue reports per project
create table if not exists public.project_issues (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  reported_by uuid references public.users(id) on delete set null,
  worker_id   uuid references public.workers(id) on delete set null,
  title       text not null,
  description text,
  severity    text not null default 'Medium', -- 'Low','Medium','High','Critical'
  status      text not null default 'Open',   -- 'Open','In Progress','Resolved','Closed'
  photo_url   text,
  photo_path  text,
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.project_issues enable row level security;

drop policy if exists admin_all_project_issues on public.project_issues;
create policy admin_all_project_issues on public.project_issues for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists worker_own_issues on public.project_issues;
create policy worker_own_issues on public.project_issues for insert to authenticated
  with check (reported_by = auth.uid());

drop policy if exists worker_read_issues on public.project_issues;
create policy worker_read_issues on public.project_issues for select to authenticated
  using (reported_by = auth.uid() or public.can_read_panel(auth.uid()));

drop trigger if exists trg_project_issues_updated_at on public.project_issues;
create trigger trg_project_issues_updated_at
  before update on public.project_issues
  for each row execute function public.set_updated_at();

-- 5. material_requests — worker material requests per project
create table if not exists public.material_requests (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  requested_by uuid references public.users(id) on delete set null,
  worker_id   uuid references public.workers(id) on delete set null,
  item_name   text not null,
  quantity    numeric not null default 1,
  unit        text default 'Stk',
  notes       text,
  status      text not null default 'Pending', -- 'Pending','Approved','Rejected','Delivered'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.material_requests enable row level security;

drop policy if exists admin_all_material_requests on public.material_requests;
create policy admin_all_material_requests on public.material_requests for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists worker_own_material_requests on public.material_requests;
create policy worker_own_material_requests on public.material_requests for insert to authenticated
  with check (requested_by = auth.uid());

drop policy if exists worker_read_material_requests on public.material_requests;
create policy worker_read_material_requests on public.material_requests for select to authenticated
  using (requested_by = auth.uid() or public.can_read_panel(auth.uid()));

drop trigger if exists trg_material_requests_updated_at on public.material_requests;
create trigger trg_material_requests_updated_at
  before update on public.material_requests
  for each row execute function public.set_updated_at();

-- 6. Storage path for project files (images bucket already exists)
-- Workers can upload to project-files/ path
drop policy if exists "Authenticated upload project files" on storage.objects;
create policy "Authenticated upload project files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'erp-images' and name like 'project-files/%');

drop policy if exists "Authenticated read project files" on storage.objects;
create policy "Authenticated read project files"
  on storage.objects for select to authenticated
  using (bucket_id = 'erp-images' and name like 'project-files/%');
