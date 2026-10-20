import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const X = await loadTs('supabase/functions/_shared/extraction.ts');
const C = await loadTs('src/lib/v2/csv.ts');

const workers = [
  { id: 'w1', full_name: 'Arben Krasniqi' },
  { id: 'w2', full_name: 'Besnik Krasniqi' },
  { id: 'w3', full_name: 'Müller Hans' },
  { id: 'w4', full_name: 'Hans Meier' },
  { id: 'w5', full_name: 'Hans Meier' },
];

test('exact name match assigns worker; near/duplicate names stay ambiguous', () => {
  assert.equal(X.matchWorker('arben krasniqi', workers).workerId, 'w1');
  assert.equal(X.matchWorker('Mueller Hans', workers).workerId, null);
  assert.equal(X.matchWorker('Müller Hans', workers).workerId, 'w3');
  const dup = X.matchWorker('Hans Meier', workers);
  assert.equal(dup.workerId, null);
  assert.deepEqual(dup.candidates, ['w4', 'w5']);
  const typo = X.matchWorker('Arben Krasnigi', workers);
  assert.equal(typo.workerId, null);
  assert.deepEqual(typo.candidates, ['w1']);
  assert.deepEqual(X.matchWorker('Krasniqi Arben', workers).candidates, ['w1']);
  assert.deepEqual(X.matchWorker('Unbekannt Person', workers), { workerId: null, candidates: [] });
});

test('consistent confident line has no flags', () => {
  const r = X.normalizeExtraction({ report_date: '2026-07-01', lines: [
    { worker_name: 'Arben Krasniqi', start_time: '7:00', end_time: '14:00', break_minutes: 60, total_hours: 6, confidence: 0.95 },
  ] }, workers);
  assert.deepEqual(r.lines[0].flags, []);
  assert.equal(r.lines[0].start_time, '07:00');
  assert.equal(r.lines[0].worker_id, 'w1');
});

test('ambiguities are flagged: mismatch, missing time, low confidence, unmatched', () => {
  const r = X.normalizeExtraction({ lines: [
    { worker_name: 'Arben Krasniqi', start_time: '07:00', end_time: '16:00', break_minutes: 60, total_hours: 6, confidence: 0.9 },
    { worker_name: 'Besnik Krasniqi', start_time: null, end_time: null, total_hours: 8, confidence: 0.9 },
    { worker_name: 'Niemand', start_time: '07:00', end_time: '12:00', confidence: 0.4 },
    { start_time: '08:00', end_time: '07:00' },
    { worker_name: 'Hans Meier', start_time: '05:00', end_time: '23:00', break_minutes: 0, total_hours: 18, confidence: 1 },
  ] }, workers);
  assert.ok(r.lines[0].flags.includes('total_mismatch'));
  assert.ok(r.lines[1].flags.includes('missing_time'));
  assert.ok(r.lines[2].flags.includes('low_confidence') && r.lines[2].flags.includes('unmatched_worker'));
  assert.ok(r.lines[3].flags.includes('missing_name') && r.lines[3].flags.includes('invalid_time'));
  assert.ok(r.lines[4].flags.includes('implausible_hours') && r.lines[4].flags.includes('ambiguous_worker'));
});

test('missing confidence is treated as low confidence; garbage input is tolerated', () => {
  const r = X.normalizeExtraction({ lines: 'nope' }, workers);
  assert.deepEqual(r.lines, []);
  const r2 = X.normalizeExtraction({ report_date: '1.7.2026', lines: [{ worker_name: 'Arben Krasniqi', start_time: 'abc', end_time: '14:00' }] }, workers);
  assert.equal(r2.report_date, null);
  assert.ok(r2.lines[0].flags.includes('invalid_time'));
  assert.ok(r2.lines[0].flags.includes('low_confidence'));
});

test('model output parsing tolerates fences', () => {
  assert.deepEqual(X.parseModelJson('```json\n{"lines": []}\n```'), { lines: [] });
  assert.equal(X.parseModelJson('no json'), null);
  assert.equal(X.parseModelJson('{broken'), null);
});

test('csv: semicolons, quotes, BOM and formula injection', () => {
  const csv = C.toCsv([['a;b', 'say "hi"', 1.5, null], ['=SUM(A1)', '-12.50', '-cmd', '@x']]);
  assert.ok(csv.startsWith('\uFEFF'));
  const [l1, l2] = csv.slice(1).trim().split('\r\n');
  assert.equal(l1, '"a;b";"say ""hi""";1.5;');
  assert.equal(l2, "'=SUM(A1);-12.50;'-cmd;'@x");
});
