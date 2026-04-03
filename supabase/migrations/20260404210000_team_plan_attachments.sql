-- Dokumente / foto me tituj për team_plans (JSON array)

alter table public.team_plans
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Punëtorët (dhe të gjithë të autentifikuarit) lexojnë vetëm skedarët nën team-plans/
drop policy if exists "Authenticated read team plan documents" on storage.objects;
create policy "Authenticated read team plan documents"
on storage.objects for select to authenticated
using (bucket_id = 'erp-documents' and name like 'team-plans/%');
