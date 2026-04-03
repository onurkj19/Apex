-- Profil i detyrueshëm në public.users për çdo llogari në auth.users
-- (p.sh. kur krijohet përdoruesi nga Dashboard pa edge function).

create or replace function public.handle_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full text;
  v_role public.app_role;
  v_meta_role text;
begin
  v_full := coalesce(nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));
  v_meta_role := nullif(lower(trim(NEW.raw_user_meta_data->>'app_role')), '');

  if v_meta_role in ('admin', 'super_admin', 'finance', 'project_manager', 'viewer', 'worker') then
    v_role := v_meta_role::public.app_role;
  else
    v_role := 'worker'::public.app_role;
  end if;

  insert into public.users (id, full_name, email, role, is_active)
  values (NEW.id, v_full, coalesce(NEW.email, ''), v_role, true)
  on conflict (id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_auth_user_insert();

-- Përdorues ekzistues në Auth pa rresht në public.users (backfill një herë)
insert into public.users (id, full_name, email, role, is_active)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  u.email,
  case
    when nullif(lower(trim(u.raw_user_meta_data->>'app_role')), '') in (
      'admin', 'super_admin', 'finance', 'project_manager', 'viewer', 'worker'
    )
    then (nullif(lower(trim(u.raw_user_meta_data->>'app_role')), ''))::public.app_role
    else 'worker'::public.app_role
  end,
  true
from auth.users u
left join public.users p on p.id = u.id
where p.id is null;

-- Punëtorë për profile worker pa worker_id
do $$
declare
  r record;
  wid uuid;
begin
  for r in
    select id, full_name
    from public.users
    where role = 'worker' and worker_id is null and is_active = true
  loop
    insert into public.workers (full_name, hourly_rate, role, group_name, is_active)
    values (r.full_name, 0, 'Monter Skele', 'Grupi A', true)
    returning id into wid;

    update public.users set worker_id = wid where id = r.id;
  end loop;
end $$;

-- Riparim nga paneli (pa SQL manual): admin kthen përdoruesit nga Auth pa profil + punëtorët pa lidhje
create or replace function public.sync_missing_profiles()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_users int := 0;
  n_workers int := 0;
  r record;
  wid uuid;
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active and u.role in ('admin', 'super_admin')
  ) then
    raise exception 'Vetem admin / super admin.';
  end if;

  insert into public.users (id, full_name, email, role, is_active)
  select
    u.id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
    u.email,
    case
      when nullif(lower(trim(u.raw_user_meta_data->>'app_role')), '') in (
        'admin', 'super_admin', 'finance', 'project_manager', 'viewer', 'worker'
      )
      then (nullif(lower(trim(u.raw_user_meta_data->>'app_role')), ''))::public.app_role
      else 'worker'::public.app_role
    end,
    true
  from auth.users u
  left join public.users p on p.id = u.id
  where p.id is null;
  get diagnostics n_users = row_count;

  for r in
    select id, full_name
    from public.users
    where role = 'worker' and worker_id is null and is_active = true
  loop
    insert into public.workers (full_name, hourly_rate, role, group_name, is_active)
    values (r.full_name, 0, 'Monter Skele', 'Grupi A', true)
    returning id into wid;

    update public.users set worker_id = wid where id = r.id;
    n_workers := n_workers + 1;
  end loop;

  return jsonb_build_object('users_created', n_users, 'workers_linked', n_workers);
end;
$$;

grant execute on function public.sync_missing_profiles() to authenticated;
