import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const D = await loadTs('src/lib/v2/decimal.ts');
const T = await loadTs('src/lib/v2/time.ts');

test('decimal parsing and formatting are exact', () => {
  assert.equal(D.formatDecimal(D.parseDecimal('0.1') + D.parseDecimal('0.2')), '0.30');
  assert.equal(D.formatDecimal(D.parseDecimal('1.005')), '1.01');
  assert.equal(D.formatDecimal(D.parseDecimal('-1.005')), '-1.01');
  assert.equal(D.formatDecimal(D.parseDecimal('-0.001')), '0.00');
  assert.equal(D.formatDecimal(D.parseDecimal(46)), '46.00');
  assert.throws(() => D.parseDecimal('1e3'));
  assert.throws(() => D.parseDecimal('abc'));
});

test('minutes * hourly rate / 60 rounds half up to cents', () => {
  assert.equal(D.formatDecimal(D.amountFromMinutes(480, D.parseDecimal('30'))), '240.00');
  assert.equal(D.formatDecimal(D.amountFromMinutes(440, D.parseDecimal('35'))), '256.67');
  assert.equal(D.formatDecimal(D.amountFromMinutes(360, D.parseDecimal('46'))), '276.00');
  assert.equal(D.formatDecimal(D.amountFromMinutes(1, D.parseDecimal('46'))), '0.77');
  assert.equal(D.formatDecimal(D.amountFromMinutes(0, D.parseDecimal('46'))), '0.00');
});

test('hours from minutes', () => {
  assert.equal(D.hoursFromMinutes(360), '6.00');
  assert.equal(D.hoursFromMinutes(450), '7.50');
  assert.equal(D.hoursFromMinutes(20), '0.33');
});

test('swiss formatting', () => {
  assert.equal(D.formatChf(D.parseDecimal('1234567.5')), "1'234'567.50");
  assert.equal(D.formatChf(D.parseDecimal('-1234.5')), "-1'234.50");
});

test('largest remainder allocation always sums to the total', () => {
  const total = D.parseDecimal('1000.00');
  const parts = D.allocateByWeights(total, [1, 1, 1]);
  assert.equal(D.formatDecimal(D.sum(parts)), '1000.00');
  assert.deepEqual(parts.map((p) => D.formatDecimal(p)), ['333.34', '333.33', '333.33']);
  const weights = [450, 360, 7, 123, 1];
  const t2 = D.parseDecimal('5234.57');
  assert.equal(D.formatDecimal(D.sum(D.allocateByWeights(t2, weights))), '5234.57');
  assert.deepEqual(D.allocateByWeights(t2, [0, 0]).map(Number), [0, 0]);
});

test('clock math: 07:00-14:00 with 60 min break is 6.00h', () => {
  const r = T.calculateWorkedMinutes({ start: '07:00', end: '14:00', breakMinutes: 60 });
  assert.deepEqual(r, { ok: true, minutes: 360 });
  assert.equal(T.calculateWorkedMinutes({ start: '14:00', end: '07:00', breakMinutes: 0 }).ok, false);
  assert.equal(T.calculateWorkedMinutes({ start: '07:00', end: '08:00', breakMinutes: 60 }).ok, false);
  assert.equal(T.calculateWorkedMinutes({ start: '25:00', end: '26:00', breakMinutes: 0 }).ok, false);
});

test('overlap detection (touching spans are fine)', () => {
  assert.deepEqual(T.findOverlaps([
    { start: '07:00', end: '12:00', breakMinutes: 0 },
    { start: '12:00', end: '16:00', breakMinutes: 0 },
    { start: '15:00', end: '17:00', breakMinutes: 0 },
  ]), [[1, 2]]);
});

test('date helpers', () => {
  assert.equal(T.isSaturday('2026-07-04'), true);
  assert.equal(T.isSaturday('2026-07-03'), false);
  assert.equal(T.isoWeekKey('2026-01-01'), '2026-W01');
  assert.equal(T.isoWeekKey('2025-12-29'), '2026-W01');
  assert.equal(T.isoWeekKey('2027-01-03'), '2026-W53');
  assert.equal(T.mondayOf('2026-07-04'), '2026-06-29');
  assert.equal(T.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(T.formatDateDe('2026-07-04'), '04.07.2026');
});
