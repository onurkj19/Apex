-- V2 / 2: role helpers + fixes for privilege-escalation paths found in the Phase 0 audit.
-- Additive / replace-only. No data is modified.

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they work inside RLS policies without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.has_app_role(uid uuid, roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = uid and u.is_active = true and u.role::text = any (roles)
  );
$$;

create or replace function public.current_worker_id()
returns uuid language sql stable security definer set search_path = public as $$
  select u.worker_id from public.users u where u.id = auth.uid() and u.is_active = true;
$$;

-- Approve hours / reports / leave, manage assignments.
create or replace function public.can_approve_hours(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_app_role(uid, array['super_admin','admin','project_manager']);
$$;

-- Read salary configuration, Saturday register, finance dashboards.
create or replace function public.can_view_payroll(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_app_role(uid, array['super_admin','admin','finance']);
$$;

-- Edit salary configuration.
create or replace function public.can_edit_payroll(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_app_role(uid, array['super_admin','admin']);
$$;

-- Mark Saturday payments as paid, issue receipts.
create or replace function public.can_pay_saturday(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_app_role(uid, array['super_admin','admin']);
$$;

-- Staff = existing is_admin() set (admin, super_admin, finance, project_manager).
create or replace function public.is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_app_role(uid, array['super_admin','admin','finance','project_manager']);
$$;

grant execute on function public.has_app_role(uuid, text[]) to authenticated;
grant execute on function public.current_worker_id() to authenticated;
grant execute on function public.can_approve_hours(uuid) to authenticated;
grant execute on function public.can_view_payroll(uuid) to authenticated;
grant execute on function public.can_edit_payroll(uuid) to authenticated;
grant execute on function public.can_pay_saturday(uuid) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
revoke execute on function public.has_app_role(uuid, text[]), public.current_worker_id(),
  public.can_approve_hours(uuid), public.can_view_payroll(uuid), public.can_edit_payroll(uuid),
  public.can_pay_saturday(uuid), public.is_staff(uuid) from anon, public;

-- ---------------------------------------------------------------------------
-- Fix 1: signup role injection.
-- Privileged roles may only come from raw_app_meta_data (not writable by the end user).
-- raw_user_meta_data can never produce anything but "worker".
-- ---------------------------------------------------------------------------
create or replace function public.signup_role(app_meta jsonb)
returns public.app_role language plpgsql immutable as $$
declare v text := nullif(lower(trim(coalesce(app_meta ->> 'app_role', ''))), '');
begin
  if v in ('admin','super_admin','finance','project_manager','viewer','worker','team_leader') then
    return v::public.app_role;
  end if;
  return 'worker'::public.app_role;
end;
$$;

create or replace function public.handle_auth_user_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_full text;
begin
  v_full := coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1));
  insert into public.users (id, full_name, email, role, is_active)
  values (NEW.id, v_full, coalesce(NEW.email, ''), public.signup_role(NEW.raw_app_meta_data), true)
  on conflict (id) do nothing;
  return NEW;
end;
$$;

create or replace function public.sync_missing_profiles()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n_users int := 0; n_workers int := 0; r record; wid uuid;
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active and u.role in ('admin', 'super_admin')
  ) then
    raise exception 'Vetem admin / super admin.';
  end if;

  insert into public.users (id, full_name, email, role, is_active)
  select u.id,
         coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
         u.email, public.signup_role(u.raw_app_meta_data), true
  from auth.users u left join public.users p on p.id = u.id
  where p.id is null;
  get diagnostics n_users = row_count;

  for r in select id, full_name from public.users where role = 'worker' and worker_id is null and is_active = true
  loop
    insert into public.workers (full_name, hourly_rate, role, group_name, is_active)
    values (r.full_name, 0, 'Monter Skele', 'Grupi A', true) returning id into wid;
    update public.users set worker_id = wid where id = r.id;
    n_workers := n_workers + 1;
  end loop;

  return jsonb_build_object('users_created', n_users, 'workers_linked', n_workers);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fix 2: users profile escalation (finance / project_manager could grant themselves super_admin).
-- Applies to direct client calls only (authenticated / anon). Edge Functions (service_role)
-- and SECURITY DEFINER RPCs are unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_user_profile_changes()
returns trigger language plpgsql as $$
declare v_uid uuid := auth.uid();
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.has_app_role(v_uid, array['admin','super_admin']) then
      raise exception 'Nur Admin / Super Admin dürfen Benutzerprofile anlegen.' using errcode = '42501';
    end if;
    if new.role = 'super_admin' and not public.has_app_role(v_uid, array['super_admin']) then
      raise exception 'Nur Super Admin darf die Rolle Super Admin vergeben.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.worker_id is distinct from old.worker_id
     or new.email is distinct from old.email
     or new.full_name is distinct from old.full_name then
    if not public.has_app_role(v_uid, array['admin','super_admin']) then
      raise exception 'Nur Admin / Super Admin dürfen Rollen und Profile ändern.' using errcode = '42501';
    end if;
    if new.role is distinct from old.role and old.id = v_uid then
      raise exception 'Die eigene Rolle kann nicht geändert werden.' using errcode = '42501';
    end if;
    if new.role = 'super_admin' and old.role is distinct from 'super_admin'
       and not public.has_app_role(v_uid, array['super_admin']) then
      raise exception 'Nur Super Admin darf die Rolle Super Admin vergeben.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_user_profile_changes on public.users;
create trigger trg_guard_user_profile_changes
before insert or update on public.users
for each row execute function public.guard_user_profile_changes();

-- Workers need to read their own worker record (name / group); no salary columns are exposed
-- beyond the pre-existing workers.hourly_rate of their OWN row.
drop policy if exists worker_read_own_worker_row on public.workers;
create policy worker_read_own_worker_row on public.workers for select to authenticated
using (id = public.current_worker_id());

-- ---------------------------------------------------------------------------
-- Fix 3: leave requests – workers must not set their own decision.
-- Allowed worker transitions keep the existing counter-offer flow working.
-- ---------------------------------------------------------------------------
create or replace function public.guard_leave_request_changes()
returns trigger language plpgsql as $$
declare v_uid uuid := auth.uid();
begin
  if current_user not in ('authenticated', 'anon') or public.can_approve_hours(v_uid) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.admin_comment is not null
       or new.admin_counter_start_date is not null or new.admin_counter_end_date is not null then
      raise exception 'Neue Anträge müssen den Status "pending" haben.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.worker_user_id is distinct from old.worker_user_id
     or new.admin_comment is distinct from old.admin_comment
     or new.admin_counter_start_date is distinct from old.admin_counter_start_date
     or new.admin_counter_end_date is distinct from old.admin_counter_end_date then
    raise exception 'Diese Felder dürfen nur von der Verwaltung geändert werden.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (old.status = 'counter_offered' and new.status in ('approved', 'worker_countered')) then
      raise exception 'Statusänderung nicht erlaubt.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_leave_request_changes on public.leave_requests;
create trigger trg_guard_leave_request_changes
before insert or update on public.leave_requests
for each row execute function public.guard_leave_request_changes();

-- ---------------------------------------------------------------------------
-- Fix 4: the generic audit trigger ran as the invoking user. Rows written by workers
-- (time entries, leave requests, reports) hit the admin-only audit_logs RLS policy and failed.
-- Running it as definer keeps behaviour identical for admins and makes worker writes auditable.
-- ---------------------------------------------------------------------------
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
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
