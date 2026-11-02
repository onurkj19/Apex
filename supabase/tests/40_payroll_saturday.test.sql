-- Salary configuration, Saturday register, cash payment, receipts, audit.
do $$
declare v_n int;
begin
  perform t.login(t.u('ad'));
  insert into public.worker_salary_config (worker_id, monthly_gross_salary, employment_start_date, notes)
  values (t.w('w1'), 5000.00, '2024-01-01', 'Fixlohn');
  insert into public.worker_salary_config (worker_id) values (t.w('w3'));
  insert into public.worker_salary_config (worker_id, saturday_hourly_rate) values (t.w('w2'), 35.00);
  perform t.eq((select monthly_gross_salary from public.worker_salary_config where worker_id = t.w('w3')), null::numeric, 'salary stays NULL until entered manually (never invented)');
  perform t.eq((select monthly_reference_hours from public.worker_salary_config where worker_id = t.w('w1')), 182.00::numeric, 'default monthly reference is 182 hours');
  perform t.eq((select saturday_hourly_rate from public.worker_salary_config where worker_id = t.w('w1')), 30.00::numeric, 'default Saturday rate is 30 CHF');

  perform t.login(t.u('fi'));
  perform t.eq((select count(*) from public.worker_salary_config)::int, 3, 'finance can read salary configuration');
  update public.worker_salary_config set monthly_gross_salary = 1 where worker_id = t.w('w1');
  get diagnostics v_n = row_count;
  perform t.eq(v_n, 0, 'finance cannot edit salary configuration (0 rows updated)');

  perform t.login(t.u('pm'));
  perform t.eq((select count(*) from public.worker_salary_config)::int, 0, 'project manager cannot read salaries');
  perform t.login(t.u('vw'));
  perform t.eq((select count(*) from public.worker_salary_config)::int, 0, 'viewer cannot read salaries');
  perform t.login(t.u('w1'));
  perform t.eq((select count(*) from public.worker_salary_config)::int, 0, 'worker cannot read own salary configuration');
  perform t.login(t.u('w2'));
  perform t.eq((select count(*) from public.worker_salary_config)::int, 0, 'worker cannot read another worker''s salary');
  perform t.throws(format('insert into public.worker_salary_config (worker_id, monthly_gross_salary) values (%L, 99999)', t.w('tl')), '%row-level security%', 'worker cannot create salary rows');
  perform t.eq((select count(*) from public.worker_monthly_salaries)::int, 0, 'worker cannot read monthly salaries');

  perform t.login(t.u('pm'));
  perform t.eq((select count(*) from public.payroll_audit_log)::int, 0, 'project manager cannot read payroll audit log');
  perform t.login(t.u('fi'));
  perform t.ok((select count(*) from public.payroll_audit_log where table_name = 'worker_salary_config') >= 3, 'salary changes are in the payroll audit log (finance can read)');
  perform t.login(t.u('vw'));
  perform t.eq((select count(*) from public.audit_logs where table_name like '%salar%' or table_name like 'saturday%')::int, 0, 'payroll tables never reach the generic audit log');
  perform t.root();
end $$;

-- Saturday work: 8 h x 30 CHF = 240 CHF, separated from fixed salary.
do $$
declare v_sat date := t.mon() + 5; v_id uuid; v_id2 uuid; v_pay record; v_rec uuid; v_rec2 uuid; v_n int; v_json jsonb; v_idx text := 'idem-' || gen_random_uuid()::text;
begin
  perform t.login(t.u('w1'));
  v_id := public.submit_time_entry(v_sat, '07:00', '16:00', 60, t.r('a1'), null, null, 'Samstag Montage', null);
  perform t.eq((select is_saturday from public.worker_time_entries where id = v_id), true, 'Saturday entry is flagged');
  select * into v_pay from public.saturday_payments where time_entry_id = v_id;
  perform t.eq(v_pay.status, 'pending', 'submitted Saturday hours create a pending payment');
  perform t.eq(v_pay.minutes, 480, 'Saturday minutes = 8 h');
  perform t.eq(v_pay.hourly_rate, 30.00::numeric, 'Saturday hourly rate 30 CHF by default');
  perform t.eq(v_pay.amount, 240.00::numeric, '8 Saturday hours x 30 CHF = 240.00 CHF');
  perform t.eq((select count(*) from public.saturday_payments)::int, 1, 'worker sees own Saturday payment');

  perform t.login(t.u('w2'));
  perform t.eq((select count(*) from public.saturday_payments)::int, 0, 'worker cannot see another worker''s Saturday payments');
  v_id2 := public.submit_time_entry(v_sat, '07:00', '14:20', 0, t.r('a1'), null, null, 'Samstag Demontage', null);
  select * into v_pay from public.saturday_payments where time_entry_id = v_id2;
  perform t.eq(v_pay.hourly_rate, 35.00::numeric, 'per-employee Saturday rate from configuration (35.00)');
  perform t.eq(v_pay.minutes, 440, '07:00-14:20 = 440 minutes');
  perform t.eq(v_pay.amount, 256.67::numeric, '440 min x 35 / 60 = 256.666... rounds to 256.67 (exact decimal arithmetic)');

  perform t.throws(format('update public.saturday_payments set status = ''paid'' where id = %L', v_pay.id), '%permission denied%', 'worker cannot write Saturday payments');
  perform t.throws(format('select public.mark_saturday_paid(array[%L]::uuid[], current_date, ''cash'', null, null, null)', v_pay.id), '%Keine Berechtigung%', 'worker cannot mark as paid');

  perform t.login(t.u('pm'));
  perform t.eq((select count(*) from public.saturday_payments)::int, 0, 'project manager cannot see Saturday payments');
  perform t.throws(format('select public.mark_saturday_paid(array[%L]::uuid[], current_date, ''cash'', null, null, null)', v_pay.id), '%Keine Berechtigung%', 'project manager cannot mark as paid');
  perform t.login(t.u('fi'));
  perform t.throws(format('select public.mark_saturday_paid(array[%L]::uuid[], current_date, ''cash'', null, null, null)', v_pay.id), '%Keine Berechtigung%', 'finance can view but not pay out');

  -- Hours approval moves payment to approved; pending payments cannot be paid
  perform t.login(t.u('ad'));
  perform t.throws(format('select public.mark_saturday_paid(array[%L]::uuid[], current_date, ''cash'', null, null, null)', (select id from public.saturday_payments where time_entry_id = v_id)),
                   '%noch nicht freigegeben%', 'pending (unapproved) Saturday payment cannot be paid');
  perform public.approve_time_entries(array[v_id, v_id2], null);
  perform t.eq((select status from public.saturday_payments where time_entry_id = v_id), 'approved', 'approved hours approve the payment');
  perform t.eq((select amount from public.saturday_payments where time_entry_id = v_id), 240.00::numeric, 'amount unchanged after approval');

  -- Finance inputs: revenue basis 46 CHF for Saturday too; payment separate; fixed salary untouched
  perform t.login(t.u('pm'));
  perform t.throws(format('select public.finance_inputs(%L, %L)', v_sat, v_sat), '%Keine Berechtigung%', 'project manager cannot read finance inputs');
  perform t.login(t.u('fi'));
  v_json := public.finance_inputs(v_sat, v_sat);
  select e into v_json from jsonb_array_elements(v_json -> 'entries') e where e ->> 'id' = v_id::text;
  perform t.eq(v_json ->> 'billing_rate', '46.00', 'Saturday hours are billed at 46.00 CHF by default');
  perform t.eq(v_json ->> 'saturday_amount', '240.00', 'Saturday payment amount is reported separately');
  perform t.eq((select monthly_gross_salary from public.worker_salary_config where worker_id = t.w('w1')), 5000.00::numeric, 'fixed monthly salary is unchanged by reported hours');

  -- Marking as paid: atomic, idempotent, receipt, history
  perform t.login(t.u('ad'));
  v_rec := public.mark_saturday_paid(array[(select id from public.saturday_payments where time_entry_id = v_id)], current_date, 'cash', 'Barzahlung KW', v_idx, null);
  perform t.eq((select status from public.saturday_payments where time_entry_id = v_id), 'paid', 'payment marked as paid (cash)');
  perform t.eq((select total_amount from public.cash_receipts where id = v_rec), 240.00::numeric, 'receipt total 240.00');
  perform t.ok((select receipt_number from public.cash_receipts where id = v_rec) ~ '^BQ-[0-9]{4}-[0-9]{5}$', 'receipt number format');
  v_rec2 := public.mark_saturday_paid(array[(select id from public.saturday_payments where time_entry_id = v_id)], current_date, 'cash', 'Barzahlung KW', v_idx, null);
  perform t.eq(v_rec2, v_rec, 'idempotency key returns the same receipt (no duplicate payment)');
  perform t.throws(format('select public.mark_saturday_paid(array[%L]::uuid[], current_date, ''cash'', null, %L, null)', (select id from public.saturday_payments where time_entry_id = v_id), 'another-key'),
                   '%bereits ausbezahlt%', 'second payment of the same entry with a new key is rejected');
  perform t.eq((select count(*) from public.cash_receipts)::int, 1, 'exactly one receipt exists');
  perform t.throws(format('select public.mark_saturday_paid(array[%L]::uuid[], current_date + 3, ''cash'', null, null, null)', (select id from public.saturday_payments where time_entry_id = v_id2)),
                   '%Zukunft%', 'payment date in the future rejected');
  perform t.ok((select count(*) from public.saturday_payment_events where payment_id = (select id from public.saturday_payments where time_entry_id = v_id)) >= 3, 'payment history recorded (created, synced, paid)');
  perform t.throws('update public.saturday_payment_events set action = ''x''', '%permission denied%', 'clients cannot modify payment history');
  perform t.root();
  perform t.throws('update public.saturday_payment_events set action = ''x''', '%append-only%', 'payment history is immutable even for privileged roles');
  perform t.login(t.u('ad'));
  perform t.throws('delete from public.saturday_payments', '%permission denied%', 'payments cannot be deleted by clients');

  -- paid entries are protected
  perform t.throws(format('select public.reject_time_entries(array[%L]::uuid[], ''Fehler im Rapport'')', v_id), '%bereits ausbezahlt%', 'cannot reject hours that were already paid out');
  perform t.throws(format('select public.adjust_time_entry_minutes(%L, 400, 400, null, ''Korrektur'')', v_id), '%bereits ausbezahlt%', 'cannot change paid hours');
  perform t.throws(format('select public.update_saturday_payment_rate(%L, 40, null, ''Korrektur'')', (select id from public.saturday_payments where time_entry_id = v_id)), '%unveränderlich%', 'paid payment rate is final');

  -- employee confirmation (portal) and paper confirmation
  perform t.login(t.u('w2'));
  perform t.throws(format('select public.confirm_cash_receipt(%L)', v_rec), '%Keine Berechtigung%', 'another employee cannot confirm the receipt');
  perform t.login(t.u('w1'));
  perform t.eq((select count(*) from public.cash_receipts)::int, 1, 'employee can read own receipt');
  perform public.confirm_cash_receipt(v_rec);
  perform t.eq((select confirmed_via from public.cash_receipts where id = v_rec), 'portal', 'receipt confirmed by employee in the portal');
  perform t.ok((select confirmed_at from public.cash_receipts where id = v_rec) is not null, 'confirmation timestamp stored');
  perform t.login(t.u('fi'));
  perform t.eq((select count(*) from public.saturday_payment_events where action = 'receipt_confirmed')::int, 1, 'confirmation is part of the auditable history');
  perform t.login(t.u('w1'));
  perform t.eq((select count(*) from public.saturday_payment_events)::int, 0, 'employees cannot read the payment history table');

  -- status workflow approved <-> unpaid, rate change with reason
  perform t.login(t.u('ad'));
  perform t.eq(public.set_saturday_payment_status(array[(select id from public.saturday_payments where time_entry_id = v_id2)], 'unpaid', 'Auszahlung ausstehend'), 1, 'payment can be marked unpaid');
  perform t.eq((select status from public.saturday_payments where time_entry_id = v_id2), 'unpaid', 'status unpaid');
  perform public.update_saturday_payment_rate((select id from public.saturday_payments where time_entry_id = v_id2), 36.00, 'overtime_reviewed', 'Vom Treuhänder geprüft');
  perform t.eq((select amount from public.saturday_payments where time_entry_id = v_id2), 264.00::numeric, 'recalculated after rate change (440 min x 36/60)');
  perform t.eq((select payroll_classification from public.saturday_payments where time_entry_id = v_id2), 'overtime_reviewed', 'payroll classification is configurable and recorded');
  perform t.eq((select payroll_classification from public.saturday_payments where time_entry_id = v_id), 'saturday_supplement', 'Saturday hours are NOT classified as overtime by default');
  perform t.throws(format('select public.update_saturday_payment_rate(%L, 40, null, '''')', (select id from public.saturday_payments where time_entry_id = v_id2)), '%Begründung%', 'rate change needs a reason');
  perform t.login(t.u('pm'));
  perform t.throws(format('select public.update_saturday_payment_rate(%L, 40, null, ''abc'')', (select id from public.saturday_payments where time_entry_id = v_id2)), '%Keine Berechtigung%', 'only payroll admins can change rates');

  -- paper confirmation by admin requires the signer name; combined receipt for two entries
  perform t.login(t.u('ad'));
  v_id := (select id from public.saturday_payments where time_entry_id = v_id2);
  v_rec := public.mark_saturday_paid(array[v_id], current_date, 'cash', null, null, null);
  perform t.throws(format('select public.confirm_cash_receipt(%L)', v_rec), '%Namen%', 'paper confirmation needs the signer name');
  perform public.confirm_cash_receipt(v_rec, 'Worker W2');
  perform t.eq((select confirmed_via from public.cash_receipts where id = v_rec), 'paper', 'paper confirmation recorded');
  perform t.root();
end $$;

-- An approved entry rejected before payout removes the pending payment; a Saturday entry moved off Saturday as well.
do $$
declare v_sat date := t.mon() + 5; v_id uuid; v_n int;
begin
  perform t.login(t.u('tl'));
  v_id := public.submit_time_entry(v_sat, '08:00', '12:00', 0, t.r('a1'), null, null, 'Samstag Leiter', null);
  perform t.eq((select count(*) from public.saturday_payments where time_entry_id = v_id)::int, 1, 'pending payment created');
  perform t.login(t.u('ad'));
  perform public.reject_time_entries(array[v_id], 'Nicht gearbeitet');
  perform t.eq((select count(*) from public.saturday_payments where time_entry_id = v_id)::int, 0, 'rejected hours remove the unpaid Saturday payment');
  perform t.ok((select count(*) from public.saturday_payment_events where action = 'removed') = 1, 'removal is logged');
  perform t.root();
end $$;
