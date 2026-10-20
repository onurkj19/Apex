-- Rollback of V2/3. DESTRUCTIVE for assignments/billing/expenses/notifications created by V2.
-- Time entries created by V2 remain in worker_time_entries (new columns are dropped, rows are kept).
drop trigger if exists trg_time_entry_integrity on public.worker_time_entries;
drop function if exists public.time_entry_integrity();
drop policy if exists time_staff_read on public.worker_time_entries;
drop policy if exists time_leader_read on public.worker_time_entries;
drop policy if exists time_approver_update on public.worker_time_entries;
drop function if exists public.submit_time_entry(date, time, time, integer, uuid, uuid, text, text, text);
drop function if exists public.update_my_time_entry(uuid, time, time, integer, text, text, text);
drop function if exists public.delete_my_time_entry(uuid);
drop function if exists public.approve_time_entries(uuid[], text);
drop function if exists public.reject_time_entries(uuid[], text);
drop function if exists public.adjust_time_entry_minutes(uuid, integer, integer, numeric, text);
drop function if exists public.admin_create_time_entry(uuid, date, time, time, integer, uuid, uuid, text, text, text);
drop function if exists public.my_worksites(date);
drop function if exists public.my_reportable_targets();
alter table public.worker_time_entries
  drop constraint if exists wte_source_check, drop constraint if exists wte_single_target_check,
  drop column if exists is_saturday, drop column if exists assignment_id, drop column if exists project_id,
  drop column if exists worksite, drop column if exists work_description, drop column if exists comment,
  drop column if exists source, drop column if exists daily_report_id, drop column if exists daily_report_line_id,
  drop column if exists approved_minutes, drop column if exists billable_minutes, drop column if exists billing_rate;
drop function if exists public.resolve_billing_rate(uuid, date);
drop function if exists public.worker_on_assignment(uuid, uuid, date);
drop function if exists public.worker_on_project(uuid, uuid);
drop function if exists public.leads_assignment(uuid);
drop table if exists public.assignment_expenses;
drop table if exists public.subcontract_assignments cascade;
drop table if exists public.assignment_workers;
drop table if exists public.assignment_billing;
drop function if exists public.ensure_assignment_billing_row();
alter table public.clients drop column if exists is_unterakkord_client, drop column if exists billing_hourly_rate,
  drop column if exists billing_saturday_rate;
delete from public.app_settings where setting_key in ('billing_defaults', 'payroll_defaults');
drop table if exists public.user_notifications;
drop function if exists public.notify_user(uuid, text, text, text, text, jsonb);
drop function if exists public.notify_approvers(text, text, text, text, jsonb);
