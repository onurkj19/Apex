-- Fshirje përdoruesi nga Cilësimet (pa Edge Function): thirrje nga app me supabase.rpc('delete_app_user', ...)

create or replace function public.delete_app_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_role public.app_role;
  v_target_role public.app_role;
  v_worker_id uuid;
begin
  if v_caller is null then
    raise exception 'Duhet te jesh i loguar.';
  end if;

  select role into v_caller_role
  from public.users
  where id = v_caller and is_active = true;

  if v_caller_role is null or v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Vetem admin / super admin mund te fshije perdoruesit.';
  end if;

  if target_user_id = v_caller then
    raise exception 'Nuk mund te fshish llogarine tende.';
  end if;

  select role, worker_id into v_target_role, v_worker_id
  from public.users
  where id = target_user_id;

  if not found then
    raise exception 'Perdoruesi nuk u gjet ne profil.';
  end if;

  if v_target_role = 'super_admin' then
    raise exception 'Super admin nuk mund te fshihet.';
  end if;

  -- Heq nga Auth; public.users fshihet me CASCADE
  delete from auth.users where id = target_user_id;

  -- Provo te fshish punëtorin e lidhur (mund te deshtoje nese ka ore / projekte)
  if v_worker_id is not null then
    begin
      delete from public.workers where id = v_worker_id;
    exception
      when others then
        raise notice 'Punetori u la (FK ose te dhena te lidhura): %', sqlerrm;
    end;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.delete_app_user(uuid) to authenticated;
