-- Role escalation, signup injection, anonymous exposure, notifications, existing policies.
do $$
declare v_n int; v_uid uuid := gen_random_uuid();
begin
  -- signup role injection: user-controlled metadata can never grant a privileged role
  insert into auth.users (id, email, raw_user_meta_data) values (v_uid, 'evil@x.ch', '{"app_role":"super_admin","full_name":"Evil"}');
  perform t.eq((select role::text from public.users where id = v_uid), 'worker', 'signup metadata cannot grant super_admin');
  insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'boss@x.ch', '{"app_role":"project_manager"}');
  perform t.eq((select role::text from public.users where email = 'boss@x.ch'), 'project_manager', 'server-side app metadata can assign a role');

  -- profile escalation
  perform t.login(t.u('fi'));
  perform t.throws(format('update public.users set role = ''super_admin'' where id = %L', t.u('fi')), '%Nur Admin%', 'finance cannot promote self to super_admin (previously possible)');
  perform t.throws(format('update public.users set role = ''admin'' where id = %L', t.u('w1')), '%Nur Admin%', 'finance cannot change other users'' roles');
  perform t.login(t.u('pm'));
  perform t.throws(format('update public.users set role = ''super_admin'' where id = %L', t.u('pm')), '%Nur Admin%', 'project manager cannot promote self');
  perform t.throws(format('update public.users set is_active = false where id = %L', t.u('w1')), '%Nur Admin%', 'project manager cannot deactivate accounts');
  perform t.login(t.u('ad'));
  perform t.throws(format('update public.users set role = ''super_admin'' where id = %L', t.u('w3')), '%Nur Super Admin%', 'admin cannot grant super_admin');
  perform t.throws(format('update public.users set role = ''project_manager'' where id = %L', t.u('ad')), '%eigene Rolle%', 'nobody changes their own role');
  update public.users set role = 'project_manager' where id = t.u('w3');
  perform t.eq((select role::text from public.users where id = t.u('w3')), 'project_manager', 'admin can change roles of other users');
  update public.users set role = 'worker' where id = t.u('w3');
  perform t.login(t.u('sa'));
  update public.users set role = 'admin' where id = t.u('w3');
  perform t.eq((select role::text from public.users where id = t.u('w3')), 'admin', 'super admin can grant admin');
  update public.users set role = 'worker' where id = t.u('w3');
  perform t.login(t.u('w1'));
  perform t.eq((select count(*) from public.users)::int, 1, 'worker only sees own profile');
  perform t.root();
end $$;

-- Anonymous visitors: public project columns only
do $$
declare v_p uuid; v_n int;
begin
  insert into public.projects (project_name, location, status, revenue, worker_cost, budget_amount)
  values ('Öffentliches Projekt', 'Baden', 'Ne pune', 12345.00, 999.00, 5000.00) returning id into v_p;
  insert into public.project_images (project_id, image_url) values (v_p, 'https://x/y.jpg');
  perform t.anon();
  select count(*) into v_n from public.projects where status = 'Ne pune' and project_name = 'Öffentliches Projekt';
  perform t.eq(v_n, 1, 'anon can still read public website projects');
  perform t.throws('select revenue from public.projects', '%permission denied%', 'anon cannot read project revenue');
  perform t.throws('select worker_cost from public.projects', '%permission denied%', 'anon cannot read worker cost');
  perform t.throws('select budget_amount from public.projects', '%permission denied%', 'anon cannot read project budget');
  perform t.throws('select * from public.projects', '%permission denied%', 'anon cannot select *');
  select count(*) into v_n from public.project_images;
  perform t.eq(v_n >= 1, true, 'anon can still read public project images');
  perform t.eq((select count(*) from public.worker_time_entries)::int, 0, 'anon sees no time entries (RLS)');
  perform t.eq((select count(*) from public.saturday_payments)::int, 0, 'anon sees no Saturday payments (RLS)');
  perform t.eq((select count(*) from public.worker_salary_config)::int, 0, 'anon sees no salary data (RLS)');
  perform t.root();
end $$;

-- Per-user notifications are private
do $$
declare v_n int;
begin
  perform t.login(t.u('w2'));
  perform t.eq((select count(*) from public.user_notifications where user_id <> t.u('w2'))::int, 0, 'worker only sees own notifications');
  perform t.throws(format('insert into public.user_notifications (user_id, type, title, message) values (%L, ''x'', ''x'', ''x'')', t.u('w1')), '%permission denied%', 'clients cannot create notifications');
  perform t.login(t.u('w1'));
  update public.user_notifications set read_at = now() where user_id = t.u('w2');
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 0, 'cannot mark someone else''s notifications');
  perform t.root();
end $$;

-- Existing Apex modules keep their access rules
do $$
declare v_n int;
begin
  perform t.login(t.u('w1'));
  perform t.eq((select count(*) from public.workers)::int, 1, 'worker reads only own worker row');
  perform t.eq((select count(*) from public.projects)::int, 0, 'worker still cannot list company projects');
  perform t.eq((select count(*) from public.finances)::int, 0, 'worker cannot read finances');
  perform t.eq((select count(*) from public.invoices)::int, 0, 'worker cannot read invoices');
  perform t.eq((select count(*) from public.clients)::int, 0, 'worker cannot read clients (billing rates)');
  perform t.eq((select count(*) from public.assignment_billing)::int, 0, 'worker cannot read assignment billing terms');
  perform t.eq((select count(*) from public.subcontract_assignments)::int, 2, 'worker reads assigned assignments (no money columns)');
  perform t.eq((select count(*) from public.assignment_expenses)::int, 0, 'worker cannot read assignment expenses');
  perform t.login(t.u('pm'));
  perform t.eq((select count(*) from public.assignment_billing)::int >= 2, true, 'staff can read assignment billing');
  perform t.eq((select count(*) from public.projects where deleted_at is null) >= 1, true, 'panel roles still read projects');
  perform t.login(t.u('vw'));
  perform t.eq((select count(*) from public.projects where deleted_at is null) >= 1, true, 'viewer still reads projects');
  perform t.eq((select count(*) from public.worker_time_entries)::int, 0, 'viewer cannot read time entries');
  perform t.eq((select count(*) from public.daily_reports)::int, 0, 'viewer cannot read daily reports');
  perform t.login(t.u('ad'));
  perform t.eq((select count(*) from public.finances)::int >= 0, true, 'admin finance access unchanged');
  insert into public.finances (title, amount, finance_type) values ('Test Ausgabe', 10, 'expense');
  perform t.ok(exists (select 1 from public.audit_logs where table_name = 'finances'), 'existing audit trigger still logs admin changes');
  perform t.root();
end $$;

-- Billing configuration is staff-only; only finance roles edit it
do $$
declare v_n int;
begin
  perform t.login(t.u('pm'));
  update public.assignment_billing set hourly_rate = 1 where assignment_id = t.r('a1');
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 0, 'project manager cannot change billing terms');
  perform t.login(t.u('fi'));
  update public.assignment_billing set hourly_rate = 48.00, billing_status = 'ready_to_bill' where assignment_id = t.r('a1');
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 1, 'finance can change assignment billing terms');
  perform t.eq(public.resolve_billing_rate(t.r('a1'), t.mon()), 48.00::numeric, 'assignment rate overrides client/default');
  perform t.eq(public.resolve_billing_rate(t.r('a1'), t.mon() + 5), 48.00::numeric, 'Saturday uses the weekday rate unless a Saturday rate is set');
  perform t.eq(public.resolve_billing_rate(t.r('a2'), t.mon() + 5), 55.00::numeric, 'client Saturday rate applies');
  update public.assignment_billing set hourly_rate = null, billing_status = 'open' where assignment_id = t.r('a1');
  perform t.eq(public.resolve_billing_rate(t.r('a1'), t.mon() + 5), 46.00::numeric, 'Saturday is billed at 46 CHF by default');
  perform t.root();
end $$;
