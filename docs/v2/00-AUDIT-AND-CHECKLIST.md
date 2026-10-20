# Apex Gerüste — Enterprise Operations Platform V2: Audit & Checklist

Branch: `cursor/workforce-platform-v2-8581` · Git checkpoint tag: `checkpoint/pre-v2-8581` (= `main` @ `29ab69e`)

## 1. Repository audit (Phase 0)

| Area | Finding |
| --- | --- |
| Frontend | Vite + React 18 + TypeScript, Tailwind + shadcn/ui, `HashRouter`, TanStack Query (mostly unused; pages call `src/lib/erp/*` API modules directly) |
| Backend | Supabase only (Auth, Postgres + RLS, Storage, Edge Functions). `backend/` is a legacy Express stub for the public site (products/projects JSON, contact form) |
| Auth | Supabase Auth password login (`/admin/login`), profile + role in `public.users`. Roles enum `app_role`: admin, super_admin, finance, project_manager, viewer, worker |
| Deployment | GitHub Pages workflow (`gh-pages.yml`), Vercel referenced in docs. Supabase deployed manually (SQL editor / CLI). No preview-deployment credentials in this environment |
| Existing admin modules | Projects (+recycle bin), Workers, Work logs, Finances, Profit/Loss, Contracts, Quotes/Invoices, Inventory, Clients/Equipment, Website content, Reports, Notifications, Audit logs, Team planning, Leave requests, Work approvals, Shop products/orders, Settings (user mgmt) |
| Existing worker module | `/admin/dashboard` for role `worker`: start/stop timer (`worker_time_entries`), assigned `team_plans`, leave requests (day_off / annual_leave with counter-offer flow) |
| Existing PWA | `vite-plugin-pwa`, manifest start URL `#/admin/login` |
| Tests | 17 Node tests (`tests/*.test.mjs`), typecheck, lint-regression baseline. CI: `.github/workflows/quality.yml` |
| Existing PDF | `jspdf` is a dependency (used for monthly reports) |

### Schema inspection

Repo-reconstructable schema = `supabase/schema.sql` + `supabase/migrations/*` + `supabase/patches/*`.

**Schema drift (live DB has objects that are not in the repo)**: `finances.payment_reconciliation` (embedded relation used by `monthly-report`), `projects.deleted_at/deleted_by`, `projects.is_public`, `shop_*` tables, storage policies for private project attachments. V2 migrations only *add* objects, never assume or alter those; they must be applied after the existing live state. **Before applying to production: run `supabase db diff` / `pg_dump --schema-only` and commit the live schema** (see runbook).

Known tables from the brief that are **not** in the repo SQL: `project_workers` (is), `worker_groups` (is), `project_files`/`project_issues`/`material_requests` (are, in `20260628…`), `clients` (is). All brief tables exist in repo SQL, plus `clients`, `quotes`, `app_settings`, `website_content`.

### Security weaknesses found (pre-existing)

1. **Privilege escalation via `public.users` write policy**: `users_admin_write` uses `is_admin()` which includes `finance` and `project_manager`; any of them can `UPDATE users SET role='super_admin'`. → V2 adds a guard trigger (only admin/super_admin may change role / worker link / active flag; only super_admin may grant `super_admin`).
2. **Signup role injection**: `handle_auth_user_insert` and `sync_missing_profiles` read `raw_user_meta_data->>'app_role'`, which is client-controlled on public signup. → V2 reads only `raw_app_meta_data` (not user-writable); user metadata can only ever yield `worker`.
3. **Workers can self-approve hours**: `worker_time_update_own` / `worker_time_insert_own` do not restrict `status`/`approved_*` columns. → V2 guard trigger.
4. **Workers can self-approve leave**: `worker_create_leave_requests` / `worker_update_own_leave_requests` do not restrict `status`. → V2 guard trigger (keeps the counter-offer flow).
5. **Generic audit trigger would leak payroll**: `audit_logs` is readable by every panel role (incl. `viewer`). V2 payroll data is therefore **not** attached to the generic audit trigger; it has its own `payroll_audit_log` readable only by payroll roles.
6. `ADMIN_SYSTEM_GUIDE.md` documents a hard-coded admin password (`apex12345`) for the legacy Express admin. Legacy file, not used by the Supabase app; recommend deleting the doc and rotating if ever used.
7. Notifications are global (no recipient); workers cannot receive targeted notifications. → V2 adds `user_notifications`.

### Duplicated / incomplete logic noted

* Break calculation: the existing timer uses *hard-coded* clock-window breaks (09:00–09:30, 12:00–13:00) computed in the browser and trusts the client. V2 calculates manual-entry hours **in the database** (`end − start − break`) and leaves the legacy timer path unchanged.
* `work_logs` (admin-entered hours × hourly cost, project-bound) and `worker_time_entries` (worker-entered) are two parallel hour sources. V2 designates **`worker_time_entries` as the single source of truth** for Unterakkord and for new Apex-project labour costing. `work_logs` stays untouched (legacy reports keep working); the V2 finance module never mixes both for the same worker/month (no double counting).
* Admin approval of hours was `super_admin`-only; leave management `super_admin`-only. V2 keeps the legacy pages/routes/permissions unchanged (tests assert them) and introduces new pages with the requested role model.

## 2. Design decisions

* **One time-entry table.** `worker_time_entries` is extended (additive columns) with `assignment_id`, `project_id`, worksite, description, `source`, report links, `approved_minutes`, `billable_minutes`, `billing_rate`, generated `is_saturday`. Exactly one of assignment/project may be set (`check (num_nonnulls(...) <= 1)`, legacy rows have none).
* **Worked / approved / billable minutes are separate.** `worked_minutes` (submitted), `approved_minutes` (payroll/hours basis), `billable_minutes` (invoice basis) — all integer minutes; hours are always derived.
* **Money is never a JS float.** SQL `numeric`; TS uses a BigInt decimal (`src/lib/v2/decimal.ts`). RPCs return money as text.
* **Overlap prevention** is a trigger with a per-worker advisory lock (an exclusion constraint would fail on existing production rows).
* **Photo reports** → `daily_reports` + `daily_report_files` + `daily_report_lines` (+ append-only `daily_report_extractions`). AI output **never** auto-approves; every line must be verified by a human; admin approval creates time entries transactionally and idempotently (`daily_report_line_id` unique on time entries). Duplicate detection uses document number, assignment/date/worker overlap and file SHA-256 as *signals*, resolved explicitly by an admin.
* **Salary** data lives in `worker_salary_config` (payroll roles only, no worker access). Salary amounts are never invented: `monthly_gross_salary` is nullable until an admin enters it. Fixed salary is never recomputed from hours.
* **Saturday payments** are a register (`saturday_payments`, one row per time entry) + immutable `saturday_payment_events` + `cash_receipts`. Payment is atomic and idempotent (`mark_saturday_paid`). Classification is configurable; nothing is labelled legal overtime.
* **Cost allocation**: each worker-month's fixed salary is allocated to that month's approved time entries by minute share (largest-remainder rounding → sums exactly), so grouping by employee/client/assignment/week/month/year can never double count. Saturday cash pay is attributed directly to its entry.
* **PDFs** are generated by an Edge Function (trusted: JWT-authenticated, RLS-scoped queries); the same builders run in the browser as a clearly-labelled *draft* fallback.
* **AI** extraction is an Edge Function using an OpenAI-compatible vision API configured by secrets; if unconfigured the manual flow continues and the UI shows the configuration requirement.

## 3. Implementation checklist

Legend: `[x]` implemented **and** tested · `[~]` implemented, only partially verified · `[ ]` not done (see Known Limitations)

### Foundation
- [x] Audit, checkpoint tag, branch
- [x] Local Postgres 16 harness with Supabase auth/storage stubs for migration + RLS tests
- [x] Migrations (versioned, additive) + rollback scripts
- [x] Security hardening of users / leave / time entries

### Unterakkord / worker portal / hours
- [x] Clients billing terms, subcontract assignments, assigned workers, expenses
- [x] Manual time entry (DB-computed hours, overlap protection, multi-assignment per day)
- [x] Mobile-first `/portal` (PWA) with home, hours, report, leave, documents, notifications
- [x] Photo Tagesrapport upload (private storage), preview, edit, submit
- [x] AI extraction Edge Function + review UI + ambiguity flags; graceful "not configured" state
- [x] Duplicate detection + explicit conflict resolution; idempotent approval
- [x] Hour approval workflow (worked / approved / billable)

### Payroll
- [x] Salary configuration (payroll-only)
- [x] Saturday register, statuses, cash payment RPC, payment history, receipt PDF, employee confirmation
- [x] Payroll audit log

### Finance
- [x] Decimal arithmetic library
- [x] Unterakkord monthly finance (per employee / client / assignment / week / month / year) + consolidated view
- [~] Apex-own projects: labour-cost report from the shared time source; extended project fields (area, budget, rental dates, montage/demontage/transport/rental split) — see limitations

### Documents
- [x] Stundenzettel, weekly team report, monthly company hours, Saturday statement, project labour cost, cash receipt (PDF + CSV)

### Leave / planning
- [x] Extended leave types, conflict detection, targeted notifications, company calendar view
- [~] Schedule conflict detection (worker double-booking, leave, vehicles); drag-and-drop planning **not** rebuilt (existing Team Planning kept)

### Quality
- [x] Unit tests (decimal, time, Saturday, finance, extraction validation, CSV, permissions)
- [x] DB integration tests (RLS, triggers, RPCs) against real Postgres
- [x] Edge function tests (mocked runtime)
- [~] Browser E2E (see test report)
