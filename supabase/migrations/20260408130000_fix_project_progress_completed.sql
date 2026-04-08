-- Projekte të mbyllura që kanë mbetur me progress 0 (para logjikës së re në app).
update public.projects
set progress = 100
where status = 'I perfunduar'
  and coalesce(progress, 0) < 100;
