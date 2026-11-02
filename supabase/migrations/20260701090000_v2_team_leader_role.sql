-- V2 / 1: new role "Team Leader / Vorarbeiter".
-- Kept in its own migration: a newly added enum value cannot be used in the same transaction.
alter type public.app_role add value if not exists 'team_leader';
