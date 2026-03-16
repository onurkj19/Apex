## Monthly Report Automation

Edge Functions: `monthly-report`, `daily-notifications`, `create-app-user`, `worker-time-reminders`

### Required secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `REPORT_RECIPIENT_EMAIL`

### Deploy

```bash
supabase functions deploy monthly-report
supabase functions deploy daily-notifications
supabase functions deploy create-app-user
supabase functions deploy worker-time-reminders
```

### Cron (every first day of month at 08:00)

```sql
select cron.schedule(
  'monthly-erp-report',
  '0 8 1 * *',
  $$
    select
      net.http_post(
        url:='https://<project-ref>.supabase.co/functions/v1/monthly-report',
        headers:='{"Authorization":"Bearer <service-role-key>","Content-Type":"application/json"}'::jsonb,
        body:='{}'::jsonb
      );
  $$
);
```

### Daily notifications (every day 07:00)

```sql
select cron.schedule(
  'daily-contract-notifications',
  '0 7 * * *',
  $$
    select
      net.http_post(
        url:='https://<project-ref>.supabase.co/functions/v1/daily-notifications',
        headers:='{"Authorization":"Bearer <service-role-key>","Content-Type":"application/json"}'::jsonb,
        body:='{}'::jsonb
      );
  $$
);
```
