import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const { handleExtract } = await loadTs('supabase/functions/_shared/extract-handler.ts');

const REPORT_ID = '11111111-1111-1111-1111-111111111111';

const makeDb = (overrides = {}) => {
  const state = {
    users: { 'u-worker': { id: 'u-worker', role: 'worker', is_active: true }, 'u-other': { id: 'u-other', role: 'worker', is_active: true }, 'u-admin': { id: 'u-admin', role: 'admin', is_active: true }, 'u-off': { id: 'u-off', role: 'worker', is_active: false } },
    reports: { [REPORT_ID]: { id: REPORT_ID, created_by: 'u-worker', status: 'draft', extraction_status: 'not_requested', report_date: '2026-07-01', document_number: null, notes: null } },
    files: [{ report_id: REPORT_ID, storage_path: 'u-worker/a.jpg', mime_type: 'image/jpeg', page_no: 1 }],
    lines: [],
    extractions: [],
    workers: [{ id: 'w1', full_name: 'Arben Krasniqi', is_active: true }],
    ...overrides,
  };
  const table = (name) => {
    const f = [];
    let op = 'select'; let payload; let head = false;
    const rows = () => {
      if (name === 'users') return Object.values(state.users);
      if (name === 'daily_reports') return Object.values(state.reports);
      if (name === 'daily_report_files') return state.files;
      if (name === 'daily_report_lines') return state.lines;
      if (name === 'daily_report_extractions') return state.extractions;
      if (name === 'workers') return state.workers;
      return [];
    };
    const q = {
      select(_c, o) { head = !!o?.head; return q; },
      eq(k, v) { f.push((r) => r[k] === v); return q; },
      in(k, vs) { f.push((r) => vs.includes(r[k])); return q; },
      order() { return q; },
      update(v) { op = 'update'; payload = v; return q; },
      insert(v) { op = 'insert'; payload = v; return q; },
      maybeSingle: async () => ({ data: rows().filter((r) => f.every((x) => x(r)))[0] ?? null, error: null }),
      then(resolve, reject) {
        const matched = rows().filter((r) => f.every((x) => x(r)));
        let result;
        if (op === 'update') { matched.forEach((r) => Object.assign(r, payload)); result = { data: matched, error: null }; }
        else if (op === 'insert') {
          const list = Array.isArray(payload) ? payload : [payload];
          if (name === 'daily_report_lines' && state.failLines) result = { data: null, error: new Error('db') };
          else { list.forEach((r) => rows().push({ ...r })); result = { data: list, error: null }; }
        } else result = head ? { count: matched.length, data: null, error: null } : { data: matched, error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return q;
  };
  const admin = {
    state,
    auth: { getUser: async (t) => (state.users[t] ? { data: { user: { id: t } }, error: null } : { data: { user: null }, error: new Error('bad') }) },
    from: table,
    storage: { from: () => ({ download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null }) }) },
  };
  return admin;
};

const call = (admin, { token = 'u-worker', body = { report_id: REPORT_ID }, env = {}, fetchImpl } = {}) =>
  handleExtract(
    new Request('https://x.invalid/extract', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }),
    { admin, env: (k) => env[k], fetchImpl: fetchImpl ?? (async () => { throw new Error('network must not be used'); }) },
  );

const aiEnv = { AI_API_KEY: 'k', AI_MODEL: 'm', AI_API_BASE_URL: 'https://ai.invalid/v1' };
const aiAnswer = (obj) => async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }), { status: 200 });

test('requires authentication and active account', async () => {
  assert.equal((await call(makeDb(), { token: null })).status, 401);
  assert.equal((await call(makeDb(), { token: 'nobody' })).status, 401);
  assert.equal((await call(makeDb(), { token: 'u-off' })).status, 403);
});

test("other workers cannot extract someone else's report", async () => {
  assert.equal((await call(makeDb(), { token: 'u-other' })).status, 404);
});

test('degrades gracefully when AI is not configured (no network, manual entry remains possible)', async () => {
  const db = makeDb();
  const res = await call(db);
  assert.equal((await res.json()).status, 'not_configured');
  assert.equal(db.state.reports[REPORT_ID].extraction_status, 'not_configured');
  assert.equal(db.state.lines.length, 0);
  assert.equal(db.state.extractions[0].status, 'not_configured');
});

test('extracts lines as unverified AI lines with flags; never auto-approves', async () => {
  const db = makeDb();
  const res = await call(db, { env: aiEnv, fetchImpl: aiAnswer({ document_number: 'R-77', report_date: '2026-07-02', site: 'Bahnhofstr', lines: [
    { worker_name: 'Arben Krasniqi', start_time: '07:00', end_time: '14:00', break_minutes: 60, total_hours: 6, confidence: 0.95 },
    { worker_name: 'Unbekannt', start_time: '07:00', end_time: '14:00', break_minutes: 60, total_hours: 6, confidence: 0.9 },
  ] }) });
  const out = await res.json();
  assert.equal(out.status, 'succeeded');
  assert.equal(db.state.lines.length, 2);
  assert.ok(db.state.lines.every((l) => l.source === 'ai' && l.verified === false));
  assert.equal(db.state.lines[0].worker_id, 'w1');
  assert.deepEqual(db.state.lines[0].flags, []);
  assert.equal(db.state.lines[1].worker_id, null);
  assert.ok(db.state.lines[1].flags.includes('unmatched_worker'));
  const report = db.state.reports[REPORT_ID];
  assert.equal(report.status, 'draft');
  assert.equal(report.report_kind, 'group');
  assert.equal(report.document_number, 'R-77');
  assert.match(report.notes, /Datum 2026-07-02/);
  assert.equal(db.state.extractions.at(-1).status, 'succeeded');
});

test('idempotent: second call does not duplicate lines or call the provider again', async () => {
  const db = makeDb();
  await call(db, { env: aiEnv, fetchImpl: aiAnswer({ lines: [{ worker_name: 'Arben Krasniqi', start_time: '07:00', end_time: '14:00', confidence: 0.9 }] }) });
  const again = await call(db, { env: aiEnv });
  assert.equal((await again.json()).status, 'lines_exist');
  assert.equal(db.state.lines.length, 1);
});

test('concurrent claim: a report already being processed is not processed twice', async () => {
  const db = makeDb();
  db.state.reports[REPORT_ID].extraction_status = 'processing';
  const res = await call(db, { env: aiEnv });
  assert.equal((await res.json()).status, 'already_processed');
});

test('provider failure and unreadable answers are recorded as failed and can be retried', async () => {
  const db = makeDb();
  const res = await call(db, { env: aiEnv, fetchImpl: async () => new Response('x', { status: 500 }) });
  assert.equal((await res.json()).status, 'failed');
  assert.equal(db.state.reports[REPORT_ID].extraction_status, 'failed');
  const bad = await call(db, { env: aiEnv, fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'no json' } }] })) });
  assert.equal((await bad.json()).status, 'failed');
  const ok = await call(db, { env: aiEnv, fetchImpl: aiAnswer({ lines: [] }) });
  assert.equal((await ok.json()).status, 'succeeded');
});

test('pdf-only uploads cannot be extracted and fail cleanly', async () => {
  const db = makeDb({ files: [{ report_id: REPORT_ID, storage_path: 'u-worker/a.pdf', mime_type: 'application/pdf', page_no: 1 }] });
  const res = await call(db, { env: aiEnv });
  assert.equal((await res.json()).status, 'failed');
});

test('approved reports cannot be re-extracted', async () => {
  const db = makeDb();
  db.state.reports[REPORT_ID].status = 'approved';
  assert.equal((await call(db, { env: aiEnv })).status, 409);
});
