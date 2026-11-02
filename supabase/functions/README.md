## Monthly Report Automation

Edge Functions: `monthly-report`, `daily-notifications`, `create-app-user`

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

## Tagesrapport AI extraction (`extract-tagesrapport`)

Reads a photographed handwritten daily report from the private `daily-reports` storage bucket, calls an
OpenAI-compatible vision API (JPEG/PNG/WebP only; PDFs are not extracted) and stores the result as **unverified** report lines (`source='ai'`,
`verified=false`). It never approves anything; a human reviews every line.

Secrets (never in frontend code):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `AI_API_KEY` and `AI_MODEL` (both required; if either is missing the function records `not_configured` and the manual flow continues)
- `AI_API_BASE_URL` (optional, default `https://api.openai.com/v1`)

```bash
supabase secrets set AI_API_KEY=... AI_MODEL=...
supabase functions deploy extract-tagesrapport
```

The caller's JWT is verified inside the function; only the report owner or a reviewer role may trigger it.
