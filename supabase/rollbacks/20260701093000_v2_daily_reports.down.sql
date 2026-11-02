-- Rollback of V2/4. DESTRUCTIVE: removes report metadata. Stored images in the private
-- bucket "daily-reports" are NOT deleted (evidence retention); remove manually if intended.
alter table public.worker_time_entries drop constraint if exists wte_daily_report_fk;
alter table public.worker_time_entries drop constraint if exists wte_daily_report_line_fk;
drop policy if exists "daily_reports_insert_own_folder" on storage.objects;
drop policy if exists "daily_reports_read_own_or_staff" on storage.objects;
drop function if exists public.create_daily_report(uuid, uuid, date, text, text);
drop function if exists public.detect_report_duplicates(uuid);
drop function if exists public.submit_daily_report(uuid);
drop function if exists public.resolve_report_duplicate(uuid, text, text);
drop function if exists public.report_approval_plan(uuid);
drop function if exists public.preview_report_approval(uuid);
drop function if exists public.resolve_report_line(uuid, text, text);
drop function if exists public.approve_daily_report(uuid, text);
drop function if exists public.reject_daily_report(uuid, text);
drop table if exists public.daily_report_extractions;
drop table if exists public.daily_report_lines;
drop table if exists public.daily_report_files;
drop table if exists public.daily_reports;
drop function if exists public.can_read_report(uuid);
drop function if exists public.can_edit_report_content(uuid);
drop function if exists public.report_line_integrity();
drop function if exists public.report_header_integrity();
drop function if exists public.block_mutation();
