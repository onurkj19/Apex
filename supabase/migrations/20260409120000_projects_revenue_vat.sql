-- MwSt 8.1%: when true, revenue is stored as gross (inkl. VAT); P/L uses net = revenue / 1.081
alter table public.projects
  add column if not exists revenue_includes_vat_8_1 boolean not null default false;

comment on column public.projects.revenue_includes_vat_8_1 is 'If true, revenue is gross including 8.1% Swiss VAT; net for profit = revenue / 1.081';
