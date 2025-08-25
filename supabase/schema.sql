-- Enable UUIDs
create extension if not exists "uuid-ossp";

-- Products
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  discount numeric(5,2) not null default 0 check (discount >= 0 and discount <= 100),
  image_url text,
  image_path text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  location text not null,
  completed_date date not null,
  client text,
  category text,
  duration text,
  created_at timestamp with time zone default now()
);

-- Project images
create table if not exists public.project_images (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  image_url text not null,
  image_path text not null,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.products enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;

-- Allow read for everyone
create policy if not exists products_read for public.products as permissive for select using (true);
create policy if not exists projects_read for public.projects as permissive for select using (true);
create policy if not exists project_images_read for public.project_images as permissive for select using (true);

-- Allow write for authenticated
create policy if not exists products_write for public.products as permissive for all to authenticated using (true) with check (true);
create policy if not exists projects_write for public.projects as permissive for all to authenticated using (true) with check (true);
create policy if not exists project_images_write for public.project_images as permissive for all to authenticated using (true) with check (true);


