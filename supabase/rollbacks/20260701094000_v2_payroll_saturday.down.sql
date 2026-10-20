-- Rollback of V2/5. DESTRUCTIVE for payroll data created by V2: export the tables first
-- (pg_dump -t public.saturday_payments -t public.cash_receipts -t public.worker_salary_config ...).
drop trigger if exists trg_sync_saturday_payment on public.worker_time_entries;
drop function if exists public.sync_saturday_payment();
drop function if exists public.set_saturday_payment_status(uuid[], text, text);
drop function if exists public.update_saturday_payment_rate(uuid, numeric, text, text);
drop function if exists public.mark_saturday_paid(uuid[], date, text, text, text, text);
drop function if exists public.confirm_cash_receipt(uuid, text);
drop function if exists public.my_month_overview(date);
drop table if exists public.saturday_payment_events;
drop table if exists public.saturday_payments;
drop table if exists public.cash_receipts;
drop sequence if exists public.cash_receipt_seq;
drop function if exists public.saturday_payment_calc();
drop function if exists public.saturday_payment_protect();
drop table if exists public.worker_monthly_salaries;
drop table if exists public.worker_salary_config;
drop function if exists public.stamp_updated_by();
drop function if exists public.stamp_entered_by();
drop table if exists public.payroll_audit_log;
drop function if exists public.log_payroll_audit();
