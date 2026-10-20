-- Rollback of V2/6. Existing 'day_off' / 'annual_leave' rows are untouched; rows using the new categories must be removed first.
drop trigger if exists trg_notify_leave_changes on public.leave_requests;
drop function if exists public.notify_leave_changes();
drop function if exists public.decide_leave_request(uuid, text, text, date, date);
drop function if exists public.leave_conflicts(uuid);
drop function if exists public.company_calendar(date, date);
drop function if exists public.schedule_conflicts(date, date);
drop function if exists public.leave_balance(uuid, integer);
drop function if exists public.leave_type_label(text);
drop table if exists public.worker_leave_config;
alter table public.leave_requests drop column if exists decided_by, drop column if exists decided_at;
alter table public.leave_requests drop constraint if exists leave_requests_request_type_check;
alter table public.leave_requests add constraint leave_requests_request_type_check
  check (request_type in ('day_off', 'annual_leave'));
