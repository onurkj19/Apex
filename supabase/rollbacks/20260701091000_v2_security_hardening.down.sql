-- Rollback of V2/2. NOTE: this re-opens the privilege-escalation paths found in the audit
-- (signup role injection, users role escalation, self-approval of leave / hours). Only use for emergency reverts.
drop trigger if exists trg_guard_user_profile_changes on public.users;
drop function if exists public.guard_user_profile_changes();
drop trigger if exists trg_guard_leave_request_changes on public.leave_requests;
drop function if exists public.guard_leave_request_changes();
drop policy if exists worker_read_own_worker_row on public.workers;
-- handle_auth_user_insert / sync_missing_profiles / log_audit_event: re-apply the definitions from
-- 20260404120000_auth_users_public_profile.sql and schema.sql if the previous behaviour is required.
-- Helper functions are kept (they are referenced by policies of later migrations; drop those first).
