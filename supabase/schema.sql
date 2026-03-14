create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('Ne pritje', 'I pranuar', 'I refuzuar', 'Ne pune', 'I perfunduar', 'I deshtuar');
  end if;

  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type public.contract_status as enum ('Active', 'Failed', 'Completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('Cash', 'Bank');
  end if;

  if not exists (select 1 from pg_type where typname = 'expense_category') then
    create type public.expense_category as enum ('Karburant', 'Pajisje', 'Blerje Produktesh', 'Qira Magazine', 'Mjete Pune');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('project_completed', 'contract_expiring', 'large_expense');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_person text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  project_name text not null,
  client_id uuid references public.clients(id) on delete set null,
  location text not null,
  description text,
  start_date date,
  end_date date,
  status public.project_status not null default 'Ne pritje',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  revenue numeric(12,2) not null default 0,
  worker_cost numeric(12,2) not null default 0,
  extra_expense numeric(12,2) not null default 0,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  role text not null,
  group_name text not null default 'Grupi A',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_workers (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (project_id, worker_id)
);

create table if not exists public.work_logs (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  location text not null,
  work_date date not null,
  hours_worked numeric(6,2) not null check (hours_worked >= 0 and hours_worked <= 24),
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  total_amount numeric(12,2) generated always as (hours_worked * hourly_rate) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.finances (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  finance_type text not null check (finance_type in ('income', 'expense')),
  category public.expense_category,
  payment_method public.payment_method not null default 'Bank',
  finance_date date not null default current_date,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  status public.contract_status not null default 'Active',
  contract_file_url text,
  contract_file_path text,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('Frames', 'Platforms', 'Guardrails', 'Anchors', 'Tools')),
  item_name text not null,
  total_quantity integer not null default 0 check (total_quantity >= 0),
  used_quantity integer not null default 0 check (used_quantity >= 0),
  available_quantity integer generated always as (total_quantity - used_quantity) stored,
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default uuid_generate_v4(),
  equipment_name text not null,
  equipment_type text not null check (equipment_type in ('Trucks', 'Vans', 'Forklifts', 'Machines')),
  status text not null default 'available',
  current_project_id uuid references public.projects(id) on delete set null,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.website_content (
  id uuid primary key default uuid_generate_v4(),
  section_key text not null unique,
  title text,
  subtitle text,
  stats jsonb not null default '{}'::jsonb,
  image_url text,
  image_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  square_meters numeric(12,2) not null default 0,
  assembly_price numeric(12,2) not null default 0,
  disassembly_price numeric(12,2) not null default 0,
  transport_cost numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (assembly_price + disassembly_price + transport_cost) stored,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(12,2) not null,
  issued_at date not null default current_date,
  due_at date,
  status text not null default 'pending',
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  month_key text not null unique,
  report_data jsonb not null default '{}'::jsonb,
  pdf_url text,
  sent_to text[] not null default '{}',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  type public.notification_type not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_workers_updated_at on public.workers;
create trigger trg_workers_updated_at before update on public.workers
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at before update on public.contracts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_website_content_updated_at on public.website_content;
create trigger trg_website_content_updated_at before update on public.website_content
for each row execute procedure public.set_updated_at();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = uid and u.role = 'admin' and u.is_active = true
  );
$$;

create or replace view public.v_dashboard_stats as
select
  (select count(*) from public.projects) as total_projects,
  (select count(*) from public.projects where status = 'Ne pune') as active_projects,
  (select count(*) from public.projects where status = 'I perfunduar') as completed_projects,
  coalesce((select sum(case when finance_type = 'income' then amount else 0 end) from public.finances where date_trunc('month', finance_date) = date_trunc('month', now())), 0) as monthly_revenue,
  coalesce((select sum(case when finance_type = 'expense' then amount else 0 end) from public.finances where date_trunc('month', finance_date) = date_trunc('month', now())), 0) as monthly_expenses,
  coalesce((select sum(case when finance_type = 'income' then amount else -amount end) from public.finances), 0) as company_balance;

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.workers enable row level security;
alter table public.project_workers enable row level security;
alter table public.work_logs enable row level security;
alter table public.finances enable row level security;
alter table public.contracts enable row level security;
alter table public.inventory enable row level security;
alter table public.equipment enable row level security;
alter table public.website_content enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists public_read_projects on public.projects;
create policy public_read_projects on public.projects for select to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists admin_all_projects on public.projects;
create policy admin_all_projects on public.projects for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_clients on public.clients;
create policy admin_all_clients on public.clients for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_workers on public.workers;
create policy admin_all_workers on public.workers for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_project_workers on public.project_workers;
create policy admin_all_project_workers on public.project_workers for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_work_logs on public.work_logs;
create policy admin_all_work_logs on public.work_logs for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_finances on public.finances;
create policy admin_all_finances on public.finances for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_contracts on public.contracts;
create policy admin_all_contracts on public.contracts for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_inventory on public.inventory;
create policy admin_all_inventory on public.inventory for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_equipment on public.equipment;
create policy admin_all_equipment on public.equipment for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_website_content on public.website_content;
create policy admin_all_website_content on public.website_content for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_quotes on public.quotes;
create policy admin_all_quotes on public.quotes for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_invoices on public.invoices;
create policy admin_all_invoices on public.invoices for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_reports on public.reports;
create policy admin_all_reports on public.reports for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_notifications on public.notifications;
create policy admin_all_notifications on public.notifications for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('erp-images', 'erp-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('erp-documents', 'erp-documents', false)
on conflict (id) do nothing;

drop policy if exists "Admins can read storage objects" on storage.objects;
create policy "Admins can read storage objects"
on storage.objects for select to authenticated
using (bucket_id in ('erp-images', 'erp-documents') and public.is_admin(auth.uid()));

drop policy if exists "Admins can upload storage objects" on storage.objects;
create policy "Admins can upload storage objects"
on storage.objects for insert to authenticated
with check (bucket_id in ('erp-images', 'erp-documents') and public.is_admin(auth.uid()));

drop policy if exists "Admins can update storage objects" on storage.objects;
create policy "Admins can update storage objects"
on storage.objects for update to authenticated
using (bucket_id in ('erp-images', 'erp-documents') and public.is_admin(auth.uid()))
with check (bucket_id in ('erp-images', 'erp-documents') and public.is_admin(auth.uid()));

drop policy if exists "Admins can delete storage objects" on storage.objects;
create policy "Admins can delete storage objects"
on storage.objects for delete to authenticated
using (bucket_id in ('erp-images', 'erp-documents') and public.is_admin(auth.uid()));

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  operation text not null,
  record_id text,
  user_id uuid references public.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists admin_all_audit_logs on public.audit_logs;
create policy admin_all_audit_logs on public.audit_logs for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.log_audit_event()
returns trigger
language plpgsql
as $$
declare
  v_user uuid;
begin
  begin
    v_user := auth.uid();
  exception when others then
    v_user := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (table_name, operation, record_id, user_id, new_data)
    values (tg_table_name, tg_op, new.id::text, v_user, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, operation, record_id, user_id, old_data, new_data)
    values (tg_table_name, tg_op, new.id::text, v_user, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (table_name, operation, record_id, user_id, old_data)
    values (tg_table_name, tg_op, old.id::text, v_user, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_projects on public.projects;
create trigger trg_audit_projects after insert or update or delete on public.projects
for each row execute procedure public.log_audit_event();

drop trigger if exists trg_audit_workers on public.workers;
create trigger trg_audit_workers after insert or update or delete on public.workers
for each row execute procedure public.log_audit_event();

drop trigger if exists trg_audit_work_logs on public.work_logs;
create trigger trg_audit_work_logs after insert or update or delete on public.work_logs
for each row execute procedure public.log_audit_event();

drop trigger if exists trg_audit_finances on public.finances;
create trigger trg_audit_finances after insert or update or delete on public.finances
for each row execute procedure public.log_audit_event();

drop trigger if exists trg_audit_contracts on public.contracts;
create trigger trg_audit_contracts after insert or update or delete on public.contracts
for each row execute procedure public.log_audit_event();

create or replace function public.on_project_completed_generate_invoice()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'I perfunduar' and coalesce(old.status, '') <> 'I perfunduar' then
    insert into public.invoices (
      project_id,
      client_id,
      invoice_number,
      amount,
      status
    )
    values (
      new.id,
      new.client_id,
      'INV-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 100000))::text, 5, '0'),
      coalesce(new.revenue, 0),
      'pending'
    )
    on conflict (invoice_number) do nothing;

    insert into public.notifications (type, title, message, metadata)
    values (
      'project_completed',
      'Projekt i perfunduar',
      'Projekti "' || new.project_name || '" u perfundua dhe fatura u gjenerua.',
      jsonb_build_object('project_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_completed_invoice on public.projects;
create trigger trg_project_completed_invoice
after update on public.projects
for each row
execute procedure public.on_project_completed_generate_invoice();

create or replace function public.on_large_expense_notify()
returns trigger
language plpgsql
as $$
begin
  if new.finance_type = 'expense' and new.amount >= 2000 then
    insert into public.notifications (type, title, message, metadata)
    values (
      'large_expense',
      'Shpenzim i madh',
      'U regjistrua nje shpenzim i madh: ' || new.title || ' - ' || new.amount || ' CHF',
      jsonb_build_object('finance_id', new.id, 'amount', new.amount)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_large_expense_notify on public.finances;
create trigger trg_large_expense_notify
after insert on public.finances
for each row
execute procedure public.on_large_expense_notify();

create or replace function public.generate_contract_expiry_notifications()
returns void
language plpgsql
as $$
begin
  insert into public.notifications (type, title, message, metadata)
  select
    'contract_expiring',
    'Kontrate qe po skadon',
    'Kontrata me ID ' || c.id::text || ' skadon me ' || c.expires_at::text,
    jsonb_build_object('contract_id', c.id, 'expires_at', c.expires_at)
  from public.contracts c
  where c.expires_at between current_date and (current_date + interval '30 day')
    and not exists (
      select 1 from public.notifications n
      where n.type = 'contract_expiring'
        and (n.metadata ->> 'contract_id')::uuid = c.id
        and n.created_at::date = current_date
    );
end;
$$;

