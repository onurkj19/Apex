-- Pagesa të pjesshme: hyrjet me project_id para përfundimit zbatohen nga fatura.
-- Në përfundim, hyrja automatike = max(0, revenue - shuma e hyrjeve ekzistuese për atë projekt).

create or replace function public.on_project_completed_generate_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  became_completed boolean;
  inv_no text;
  paid_prior numeric;
  remainder numeric;
begin
  became_completed := false;
  if tg_op = 'INSERT' then
    became_completed := (new.status = 'I perfunduar');
  elsif tg_op = 'UPDATE' then
    became_completed := (new.status = 'I perfunduar' and old.status is distinct from 'I perfunduar');
  end if;

  if not became_completed then
    return new;
  end if;

  inv_no := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 100000))::text, 5, '0');

  insert into public.invoices (
    project_id,
    client_id,
    invoice_number,
    amount,
    status
  )
  values (
    new.id,
    new.client_id,
    inv_no,
    coalesce(new.revenue, 0),
    'pending'
  )
  on conflict (invoice_number) do nothing;

  if coalesce(new.revenue, 0) > 0 then
    if not exists (
      select 1
      from public.finances f
      where f.project_id = new.id
        and f.finance_type = 'income'
        and f.title = 'Hyrje automatike: projekt i perfunduar'
    ) then
      select coalesce(sum(f.amount), 0) into paid_prior
      from public.finances f
      where f.project_id = new.id
        and f.finance_type = 'income';

      remainder := greatest(0::numeric, coalesce(new.revenue, 0) - paid_prior);

      if remainder > 0 then
        insert into public.finances (
          project_id,
          title,
          amount,
          finance_type,
          category,
          payment_method,
          finance_date,
          created_by
        )
        values (
          new.id,
          'Hyrje automatike: projekt i perfunduar',
          remainder,
          'income',
          null,
          'Bank',
          coalesce(new.end_date, current_date),
          null
        );

        insert into public.notifications (type, title, message, metadata)
        values (
          'finance_income_created',
          'Hyrje automatike nga projekti',
          'Projekti "' || new.project_name || '" u përfundua. U regjistrua hyrja ' || trim(to_char(remainder, '999999999999.99')) || ' CHF (mbetja pas pagesave të mëparshme).',
          jsonb_build_object('project_id', new.id, 'amount', remainder, 'auto_from_project', true, 'paid_prior', paid_prior)
        );
      end if;
    end if;
  end if;

  insert into public.notifications (type, title, message, metadata)
  values (
    'project_completed',
    'Projekt i përfunduar',
    'Projekti "' || new.project_name || '" u përfundua dhe fatura u gjenerua.',
    jsonb_build_object('project_id', new.id)
  );

  return new;
end;
$$;
