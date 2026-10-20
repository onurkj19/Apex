#!/usr/bin/env bash
# Builds a throw-away database from schema.sql + migrations and runs supabase/tests/*.test.sql
# against real PostgreSQL (RLS, triggers, RPCs). Requires local PostgreSQL 14+ binaries.
# Usage: scripts/db-test.sh        (PGBIN=/usr/lib/postgresql/16/bin PGTEST_PORT=54329 PGTEST_DIR=/tmp/pgtest)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || echo /usr/lib/postgresql/16/bin/pg_ctl)")}"
PORT="${PGTEST_PORT:-54329}"
SOCK="${PGTEST_DIR:-/tmp/pgtest}"
DB="apex_v2_test"
LOG="$SOCK/last-run.log"
mkdir -p "$SOCK"
: > "$LOG"
export PGOPTIONS='-c client_min_messages=warning'
PSQL=("$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)

if ! "$PGBIN/pg_isready" -h "$SOCK" -p "$PORT" >/dev/null 2>&1; then
  [ -d "$SOCK/data" ] || "$PGBIN/initdb" -D "$SOCK/data" -A trust -U postgres >/dev/null
  "$PGBIN/pg_ctl" -D "$SOCK/data" -o "-p $PORT -k $SOCK" -l "$SOCK/pg.log" -w start >/dev/null
fi

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null || exit 2
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/00_bootstrap_stub.sql" >/dev/null || exit 2
# schema.sql was written for incremental use in the SQL editor: the first pass tolerates ordering errors.
"$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d "$DB" -q -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1 || true
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/schema.sql" >/dev/null || exit 2
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null || { echo "MIGRATION FAILED: $(basename "$f")"; exit 2; }
done
echo "migrations applied: $(ls "$ROOT"/supabase/migrations/*.sql | wc -l)"

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/10_helpers.sql" >/dev/null || exit 2
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/20_fixtures.sql" >/dev/null || exit 2

export PGOPTIONS='-c client_min_messages=notice'
fail=0
for t in "$ROOT"/supabase/tests/*.test.sql; do
  [ -e "$t" ] || continue
  echo "== $(basename "$t")"
  "${PSQL[@]}" -d "$DB" -f "$t" 2>&1 \
    | sed -e 's/^psql:[^:]*:[0-9]*: //' -e 's/^NOTICE:  //' | grep -v -E '^(CONTEXT|PL/pgSQL|SQL statement|$)' | tee -a "$LOG"
  if grep -q -E '^(ERROR|ASSERTION)|ASSERTION FAILED' "$LOG"; then fail=1; fi
done
echo "passed assertions: $(grep -c '^ok - ' "$LOG")"
[ "$fail" -eq 0 ] && echo "DB TESTS PASSED" || echo "DB TESTS FAILED"
exit $fail
