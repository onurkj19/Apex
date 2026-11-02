-- Isolated fixtures (never touches production data; test DB only).
create table t.actors (name text primary key, uid uuid not null, wid uuid, role text not null);
create table t.refs (name text primary key, id uuid not null);
create or replace function t.u(p_name text) returns uuid language sql stable as $$ select uid from t.actors where name = p_name $$;
create or replace function t.w(p_name text) returns uuid language sql stable as $$ select wid from t.actors where name = p_name $$;
create or replace function t.r(p_name text) returns uuid language sql stable as $$ select id from t.refs where name = p_name $$;
-- Monday two weeks ago, in Zurich: stable "past" week for all tests
create or replace function t.mon() returns date language sql stable as $$
  select (date_trunc('week', (now() at time zone 'Europe/Zurich')::date - 14))::date $$;

do $$
declare r record; v_uid uuid; v_wid uuid;
begin
  for r in select * from (values
    ('sa', 'super_admin'), ('ad', 'admin'), ('fi', 'finance'), ('pm', 'project_manager'), ('vw', 'viewer'),
    ('w1', 'worker'), ('w2', 'worker'), ('w3', 'worker'), ('tl', 'team_leader')) v(name, role)
  loop
    v_uid := gen_random_uuid();
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
    values (v_uid, r.name || '@apex.test', jsonb_build_object('app_role', r.role), jsonb_build_object('full_name', upper(r.name)));
    v_wid := null;
    if r.role in ('worker', 'team_leader') then
      insert into public.workers (full_name, hourly_rate, role) values ('Worker ' || upper(r.name), 0, 'Monteur') returning id into v_wid;
      update public.users set worker_id = v_wid where id = v_uid;
    end if;
    insert into t.actors values (r.name, v_uid, v_wid, r.role);
  end loop;
end $$;

insert into public.clients (company_name, client_address, is_unterakkord_client) values ('REX Gerüstbau AG', 'Industriestrasse 1, 8000 Zürich', true);
insert into public.clients (company_name, client_address, is_unterakkord_client, billing_hourly_rate, billing_saturday_rate)
values ('Muster Bau AG', 'Hauptstrasse 5, 5400 Baden', true, 50.00, 55.00);

do $$
declare c1 uuid := (select id from public.clients where company_name like 'REX%'); c2 uuid := (select id from public.clients where company_name like 'Muster%');
        a1 uuid; a2 uuid; p1 uuid;
begin
  insert into public.subcontract_assignments (assignment_number, client_id, worksite_address, team_leader_worker_id, start_date, status, planned_daily_minutes)
  values ('A-100', c1, 'Bahnhofstrasse 10, 8001 Zürich', t.w('tl'), t.mon() - 30, 'active', 480) returning id into a1;
  insert into public.subcontract_assignments (assignment_number, client_id, worksite_address, start_date, status)
  values ('M-7', c2, 'Seestrasse 3, 8800 Thalwil', t.mon() - 30, 'active') returning id into a2;
  insert into public.assignment_workers (assignment_id, worker_id) values (a1, t.w('w1')), (a1, t.w('w2')), (a1, t.w('tl')), (a2, t.w('w1'));
  insert into public.projects (project_name, location, status) values ('Apex Projekt Test', 'Spreitenbach', 'Ne pune') returning id into p1;
  insert into public.project_workers (project_id, worker_id) values (p1, t.w('w1'));
  insert into t.refs values ('a1', a1), ('a2', a2), ('p1', p1), ('c1', c1), ('c2', c2);
end $$;
grant select on t.actors, t.refs to public;
