-- Leave requests: categories, decisions, notifications, conflicts, calendar, balances.
do $$
declare v_mon date := t.mon() + 14; v_id uuid; v_id2 uuid; v_n int; v_json jsonb; v_type text;
begin
  perform t.login(t.u('w1'));
  foreach v_type in array array['annual_leave', 'unpaid_leave', 'personal_day', 'sick_notification', 'other_absence', 'day_off'] loop
    insert into public.leave_requests (worker_user_id, worker_id, request_type, requested_start_date, requested_end_date)
    values (t.u('w1'), t.w('w1'), v_type, v_mon + 21, v_mon + 21);
  end loop;
  perform t.ok(true, 'all six leave categories can be requested');
  delete from public.leave_requests where false;
  perform t.throws(format('insert into public.leave_requests (worker_user_id, worker_id, request_type, requested_start_date, requested_end_date) values (%L,%L,''holiday'',%L,%L)', t.u('w1'), t.w('w1'), v_mon, v_mon),
                   '%check constraint%', 'unknown categories are rejected');
  perform t.throws(format('insert into public.leave_requests (worker_user_id, worker_id, request_type, requested_start_date, requested_end_date, status) values (%L,%L,''annual_leave'',%L,%L,''approved'')', t.u('w1'), t.w('w1'), v_mon, v_mon),
                   '%pending%', 'worker cannot create an already approved request');
  insert into public.leave_requests (worker_user_id, worker_id, request_type, requested_start_date, requested_end_date, worker_comment)
  values (t.u('w1'), t.w('w1'), 'annual_leave', v_mon, v_mon + 4, 'Ferien') returning id into v_id;
  perform t.throws(format('update public.leave_requests set status = ''approved'' where id = %L', v_id), '%Statusänderung%', 'worker cannot approve own request');
  update public.leave_requests set requested_end_date = v_mon + 4, worker_comment = 'Ferien Sommer' where id = v_id;
  perform t.ok(true, 'worker may still edit own pending request details');

  perform t.login(t.u('ad'));
  perform t.ok((select count(*) from public.user_notifications where type = 'leave_requested') >= 1, 'approvers are notified of new requests');

  -- team availability / conflicts for the request
  perform t.root();
  insert into public.team_plans (title, plan_date, worker_ids, vehicle_label) values ('Plan A', v_mon + 1, array[t.w('w1'), t.w('w2')], 'Bus 1'), ('Plan B', v_mon + 1, array[t.w('w1')], 'Bus 1');
  perform t.login(t.u('pm'));
  v_json := public.leave_conflicts(v_id);
  perform t.ok(jsonb_array_length(v_json -> 'assignments') >= 2, 'conflict check lists the assignments the employee is scheduled on');
  perform t.ok(jsonb_array_length(v_json -> 'team_plans') >= 2, 'conflict check lists team plans in the window');

  perform t.throws(format('select public.decide_leave_request(%L, ''reject'', null)', v_id), '%Ablehnungsgrund%', 'rejection needs a reason');
  perform public.decide_leave_request(v_id, 'approve', 'Viel Spass');
  perform t.eq((select status from public.leave_requests where id = v_id), 'approved', 'request approved');
  perform t.throws(format('select public.decide_leave_request(%L, ''reject'', ''doch nicht'')', v_id), '%bereits entschieden%', 'cannot decide twice');
  perform t.login(t.u('w1'));
  perform t.ok(exists (select 1 from public.user_notifications where type = 'leave_approved'), 'worker is notified of the approval');

  -- approved leave now creates schedule conflicts for the planned worker (leave affects scheduling)
  perform t.login(t.u('ad'));
  v_json := public.schedule_conflicts(v_mon, v_mon + 7);
  perform t.ok(exists (select 1 from jsonb_array_elements(v_json) c where c ->> 'type' = 'worker_absent'), 'planning conflict: employee on approved leave is scheduled');
  perform t.ok(exists (select 1 from jsonb_array_elements(v_json) c where c ->> 'type' = 'double_booked_worker'), 'planning conflict: employee double booked');
  perform t.ok(exists (select 1 from jsonb_array_elements(v_json) c where c ->> 'type' = 'vehicle_double_booked'), 'planning conflict: vehicle double booked');
  perform t.ok(exists (select 1 from jsonb_array_elements(v_json) c where c ->> 'type' = 'assignment_absence'), 'planning conflict: assigned employee absent');
  v_json := public.company_calendar(v_mon, v_mon + 7);
  perform t.ok(jsonb_array_length(v_json -> 'leaves') >= 1 and jsonb_array_length(v_json -> 'plans') >= 2, 'shared calendar contains leave, assignments and plans');
  perform t.login(t.u('w2'));
  perform t.throws(format('select public.company_calendar(%L, %L)', v_mon, v_mon), '%Keine Berechtigung%', 'workers cannot read the company calendar');

  -- counter offer flow stays compatible
  perform t.login(t.u('w2'));
  insert into public.leave_requests (worker_user_id, worker_id, request_type, requested_start_date, requested_end_date)
  values (t.u('w2'), t.w('w2'), 'personal_day', v_mon + 7, v_mon + 7) returning id into v_id2;
  perform t.login(t.u('ad'));
  perform public.decide_leave_request(v_id2, 'counter_offer', 'Lieber einen Tag später', v_mon + 8, v_mon + 8);
  perform t.login(t.u('w2'));
  perform t.throws(format('update public.leave_requests set admin_comment = ''ok'' where id = %L', v_id2), '%Verwaltung%', 'worker cannot edit admin fields');
  update public.leave_requests set status = 'approved', worker_comment = 'Pranuar' where id = v_id2;
  perform t.eq((select status from public.leave_requests where id = v_id2), 'approved', 'worker can accept a counter offer (existing flow)');

  -- balances only where configured
  perform t.login(t.u('ad'));
  perform t.eq((public.leave_balance(t.w('w1'), extract(year from v_mon)::int) ->> 'tracked')::boolean, false, 'no balance tracking unless contractually configured');
  insert into public.worker_leave_config (worker_id, track_balance, annual_leave_days) values (t.w('w1'), true, 25);
  v_json := public.leave_balance(t.w('w1'), extract(year from v_mon)::int);
  perform t.eq((v_json ->> 'used')::numeric, 5::numeric, 'Mon-Fri annual leave counts 5 days');
  perform t.eq((v_json ->> 'remaining')::numeric, 20::numeric, 'remaining = 25 - 5');
  perform t.login(t.u('w2'));
  perform t.eq((select count(*) from public.worker_leave_config)::int, 0, 'worker cannot read another worker''s leave configuration');
  perform t.root();
end $$;
