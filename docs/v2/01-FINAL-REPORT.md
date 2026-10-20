# Apex Gerüste V2 — Final Report

Branch `cursor/workforce-platform-v2-8581` (base `main` @ `29ab69e`, checkpoint tag `checkpoint/pre-v2-8581`).
Commit ids: see `git log main..HEAD` (last code commit before the docs/e2e commit: `5b07375`).
Preview URL: **none** (no preview-deployment credentials in this environment; nothing was deployed).

## 1. Summary of features

Built on top of the existing app (no existing table, route, page or record was removed or rewritten):

- **Unterakkord**: client billing terms (default 46.00 CHF/h incl. Saturday, overridable per client and per assignment), subcontract assignments, assigned workers, expenses. Worked / approved / billable minutes are separate columns; the billing rate is snapshotted at approval.
- **Per-employee accounts and roles**: `super_admin`, `admin`, `project_manager`, `team_leader` (new), `worker`, `finance`. Mobile-first worker portal under `/portal` (Heute, Stunden, Rapport, Urlaub, Mehr).
- **Daily time reporting**: manual entry (DB-computed hours; 07:00–14:00 with 60 min break = 6.00 h), overlap prevention, several assignments per day, photo upload of the handwritten Tagesrapport (private bucket), AI extraction through an Edge Function with editable human review, duplicate signals with explicit resolution, transactional + idempotent approval. AI output is never auto-approved.
- **Salary configuration** (payroll roles only): default 182 reference hours, monthly gross salary entered manually (nullable, nothing invented), fixed salary not recomputed from hours.
- **Saturday register**: default 30.00 CHF/h (configurable), statuses Pending / Approved / Unpaid / Paid, "Als bar bezahlt markieren" (admin roles only), payment history, cash receipt with employee confirmation, payroll classification configurable and audited.
- **Unterakkord finance**: per employee, client, assignment, week, month, year; salary is allocated once per worker-month by minute share (largest remainder), so costs are never double counted.
- **Reports**: Stundenzettel, weekly team, monthly company hours, Saturday statement, project labour cost, cash receipt as German A4 PDF, plus CSV (semicolon, Excel-friendly).
- **Leave**: annual / unpaid / personal / sick / other, approve/reject with counter-offer flow kept, conflict detection, company calendar, targeted notifications, balances only where configured.
- **Scheduling conflicts**: worker vs. leave vs. assignment overlaps.
- **Security hardening** of pre-existing weaknesses (see section 5).

## 2. Migrations (`supabase/migrations`, each has a `supabase/rollbacks/*.down.sql`)

| File | Purpose |
| --- | --- |
| `20260701090000_v2_team_leader_role` | `team_leader` enum value |
| `20260701091000_v2_security_hardening` | role/worker-link guard on `users`, signup role injection fix, time-entry and leave status guards, `user_notifications`, payroll audit log |
| `20260701092000_v2_unterakkord_core` | clients billing, assignments, assigned workers, expenses, time-entry columns, overlap trigger, submit/approve RPCs |
| `20260701093000_v2_daily_reports` | reports, files, lines, extractions, duplicate detection, `daily-reports` private bucket, approval RPCs |
| `20260701094000_v2_payroll_saturday` | salary config, Saturday register, events, cash receipts, payment RPCs |
| `20260701095000_v2_leave_calendar` | leave types, conflicts, calendar, balance |
| `20260701096000_v2_finance_projects` | `finance_inputs`, extended project columns |

All are additive. Rollback of the core migration was tested (legacy time entries survive).

## 3. Reused modules

`src/lib/supabase.ts`, `erp-api.ts` auth/session, `permissions.ts` (extended, legacy assertions unchanged), `AdminLayout`/`ProtectedRoute`, existing Team Planning and Leave Requests pages, shadcn UI components, `jspdf`, `worker_time_entries`, `clients`, `projects`, `create-app-user` Edge Function (extended for `team_leader`).

## 4. New pages / routes

- Portal: `/portal`, `/portal/stunden`, `/portal/rapport`, `/portal/urlaub`, `/portal/mehr`
- Admin: `/admin/stunden`, `/admin/tagesrapporte`, `/admin/samstag`, `/admin/lohn`, `/admin/unterakkord`, `/admin/finanz-unterakkord`, `/admin/urlaub`, `/admin/kalender`, `/admin/pdf-berichte`
- Edge Function: `extract-tagesrapport`

## 5. Auth / security changes

Pre-existing issues fixed (details in `00-AUDIT-AND-CHECKLIST.md`): privilege escalation through `users` write policy, signup role injection via `raw_user_meta_data`, workers self-approving hours and leave. New: payroll data has its own audit log and is not exposed through the generic `audit_logs`; money is `numeric` in SQL and BigInt decimal in TS; storage bucket is private (signed URLs); guard triggers detect direct client calls; client RPCs are granted to `authenticated` only; no AI key in the frontend.

## 6. Test results (run on this branch)

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` (Node unit tests) | 62 / 62 pass |
| `npm run lint:regression` | no new lint errors |
| `npx vite build` | pass |
| `npm run test:db` -> `scripts/db-test.sh` (real PostgreSQL 16, RLS/triggers/RPCs) | 248 assertions pass |
| `scripts/db-rollback-test.sh` | pass |
| `npm run test:e2e-mock` (Playwright + Chrome, **in-memory mock backend**) | 21 / 21 pass |

What the mock smoke test does and does not prove: it renders the 5 portal pages (mobile viewport) and 9 admin pages without console errors, checks seeded data appears, opens the Saturday "Als bar bezahlt markieren" dialog and confirms `mark_saturday_paid` is called, and downloads a real `%PDF-` Stundenzettel. The mock does **not** enforce RLS or DB rules; authorization is proven only by the SQL tests. Manual-entry submission and photo upload in the portal were not driven end to end in the browser.

Of the 22 requested scenarios, those about DB rules (overlap, hour math, approval, duplicates, Saturday payment idempotency, role access, leave conflicts, cost allocation) are covered by DB/unit tests. Real-device, real-backend, and AI-on-real-photo scenarios have **not** been tested.

## 7. PDF export

German A4 PDFs via jsPDF (`src/lib/v2/pdf/`), CSV via `src/lib/v2/csv.ts`. Model builders are unit tested; one Stundenzettel download was verified in the mock browser run. Generation is **client-side** from RLS-scoped data; the brief's "trusted generation" (server-side renderer) is not implemented.

## 8. Known limitations

- Nothing has been run against a live Supabase project; migrations are verified only on the local Postgres harness with auth/storage stubs.
- Live schema drift (see audit): run a schema diff before applying.
- PDFs are generated in the browser, not on a trusted server.
- AI extraction: handler tested with mocks only; not run on Deno with a real model; JPEG/PNG/WebP only (PDF uploads are stored but not extracted); handwriting accuracy unknown.
- UI for the extended Apex-project fields (area, budget, rental dates, montage/demontage/transport/rental split) is **not** built; columns exist. No dedicated Apex-project finance page; project labour cost is available as a report only.
- Drag-and-drop planning not rebuilt; vehicle/material reservation conflicts not implemented.
- Team leaders see their team through `my_worksites`; no dedicated team-leader admin screens.
- No backup automation is implemented; see runbook.
- No real-device PWA / offline test; the portal needs a connection to submit.
- The new CI job `database` in `.github/workflows/quality.yml` has not been run on GitHub yet.

## 9. Environment variables / secrets

| Name | Where | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | frontend build | existing |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | existing; server only |
| `AI_API_KEY`, `AI_MODEL` | `extract-tagesrapport` | both required, otherwise `not_configured` |
| `AI_API_BASE_URL` | `extract-tagesrapport` | optional, default `https://api.openai.com/v1` |

## 10. Runbook (before production)

1. **Back up** production (`pg_dump` or Supabase backup) and export the live schema (`supabase db diff` / `pg_dump --schema-only`); compare with the repo.
2. Apply migrations in order to a **staging** project; run `scripts/db-test.sh` logic equivalents there (or at least smoke-test RPCs with real users).
3. Deploy `create-app-user` (updated) and `extract-tagesrapport`; set the AI secrets.
4. Create employee accounts (Einstellungen -> Benutzer) with role `worker` / `team_leader`, link each to a `workers` row.
5. Enter salary configuration manually (no amounts are pre-filled).
6. Roll back with `supabase/rollbacks/*.down.sql` in reverse order if needed (note: rollback drops V2 data).

## 11. Git

Branch `cursor/workforce-platform-v2-8581`; commits listed by `git log main..HEAD`.

## 12. Production readiness assessment

**Not production-ready yet.** The database layer is the strongest part (real-Postgres tests of RLS, triggers and RPCs). The UI has only been checked against a mock backend, the AI path and PDF generation have not met real data, and no staging deployment exists. Recommended gate: apply to staging, run the portal and admin flows with real accounts and 2-3 real handwritten reports, then deploy. Do not push payroll/finance/auth/database changes to production before that.
