-- Përditëso bazën ekzistuese: projekte + foto për vizitorë anonimë në website.
-- Ekzekuto në Supabase SQL Editor pas backup-it.

create table if not exists public.project_images (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text not null,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_images_project_id on public.project_images(project_id);

alter table public.project_images enable row level security;

drop policy if exists admin_all_project_images on public.project_images;
create policy admin_all_project_images on public.project_images for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists read_project_images_panel on public.project_images;
create policy read_project_images_panel on public.project_images for select to authenticated
using (public.can_read_panel(auth.uid()));

drop policy if exists anon_read_website_project_images on public.project_images;
create policy anon_read_website_project_images on public.project_images for select to anon
using (
  exists (
    select 1
    from public.projects pr
    where pr.id = project_id
      and pr.status in ('I pranuar', 'Ne pune', 'I perfunduar')
  )
);

drop policy if exists anon_read_website_projects on public.projects;
create policy anon_read_website_projects on public.projects for select to anon
using (status in ('I pranuar', 'Ne pune', 'I perfunduar'));

drop trigger if exists trg_audit_project_images on public.project_images;
create trigger trg_audit_project_images after insert or update or delete on public.project_images
for each row execute procedure public.log_audit_event();
