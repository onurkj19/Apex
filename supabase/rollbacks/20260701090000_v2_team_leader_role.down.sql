-- PostgreSQL cannot remove a value from an enum type. The 'team_leader' value stays but is unused.
-- Optionally move users: update public.users set role = 'worker' where role = 'team_leader';
select 1;
