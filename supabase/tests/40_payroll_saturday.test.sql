-- Salary configuration, Saturday register, cash payment, receipts, audit.
do $$
declare v_sat date := t.mon() + 5; v_id uuid; v_pay record; v_rec uuid; v_rec2 uuid; v_n int; v_json jsonb;
begin
  -- admin configures salary for w1 (manual amount; nothing is invented for others)
  perform t.login(t.u('ad'));
  insert into public.worker_salary_config (worker_id, monthly_gross_salary, employment_start_date, notes)
  values (t.w('w1'), 5000.00, '2024-01-01', 'Fixlohn');
  insert into public.worker_salary_config (worker_id) values (t.w('w3'));
  perform t.eq((select monthly_gross_salary from public.worker_salary_config where worker_id = t.w('w3')), null::numeric, 'salary is NULL until entered manually (not invented)');
  perform t.eq((select monthly_reference_hours from public.worker_salary_config where worker_id = t.w('w1')), 182.00::numeric, 'default monthly reference is 182 hours');
  perform t.eq((select saturday_hourly_rate from public.worker_salary_config where worker_id = t.w('w1')), 30.00::numeric, 'default Saturday rate is 30 CHF');
  insert into public.worker_salary_config (worker_id, saturday_hourly_rate) values (t.w('w2'), 35.00);

  -- salary visibility
  perform t.login(t.u('fi'));
  perform t.eq((select count(*) from public.worker_salary_config)::int, 3, 'finance can read salary configuration');
  perform t.throws(format('update public.worker_salary_config set monthly_gross_salary = 1 where worker_id = %L', t.w('w1')), '%', 'finance cannot edit salary configuration')
    ;
EXCEPTION WHEN OTHERS THEN
  raise;
end $$;
