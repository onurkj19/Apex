#!/usr/bin/env bash
# Applies all migrations, then the V2 rollbacks in reverse order, and verifies the legacy schema still works.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"; SOCK="${PGTEST_DIR:-/tmp/pgtest}"; PORT="${PGTEST_PORT:-54329}"; DB=apex_v2_rollback
export PGOPTIONS='-c client_min_messages=warning'
P=("$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null || exit 2
"${P[@]}" -d $DB -f "$ROOT/supabase/tests/00_bootstrap_stub.sql" >/dev/null
"$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d $DB -q -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1 || true
"${P[@]}" -d $DB -f "$ROOT/supabase/schema.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do "${P[@]}" -d $DB -f "$f" >/dev/null || { echo "migrate failed $f"; exit 2; }; done
# legacy data created BEFORE the rollback
"${P[@]}" -d $DB >/dev/null <<'SQL'
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','w@x.ch');
insert into public.workers(id,full_name,hourly_rate,role) values ('00000000-0000-0000-0000-0000000000b1','W',0,'M');
update public.users set worker_id='00000000-0000-0000-0000-0000000000b1' where id='00000000-0000-0000-0000-0000000000a1';
insert into public.worker_time_entries(worker_user_id,worker_id,start_at,end_at,worked_minutes,status)
values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1', now()-interval '3 days', now()-interval '3 days'+interval '8 hours', 450, 'approved');
SQL
for f in $(ls -r "$ROOT"/supabase/rollbacks/*.down.sql); do "${P[@]}" -d $DB -f "$f" >/dev/null || { echo "ROLLBACK FAILED: $f"; exit 1; }; done
n=$("${P[@]}" -d $DB -tA -c "select count(*) from public.worker_time_entries where worked_minutes = 450")
[ "$n" = "1" ] && echo "ROLLBACK OK: legacy time entry preserved" || { echo "ROLLBACK DATA LOSS"; exit 1; }
"${P[@]}" -d $DB -tA -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('daily_reports','saturday_payments','subcontract_assignments')" | grep -q '^0$' && echo "V2 tables removed"
