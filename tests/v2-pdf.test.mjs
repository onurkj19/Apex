import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const M = await loadTs('src/lib/v2/pdf/models.ts');
const R = await loadTs('src/lib/v2/pdf/render.ts');

const text = (bytes) => Buffer.from(bytes).toString('latin1');
const pages = (bytes) => (text(bytes).match(/\/Type\s*\/Page\b/g) || []).length;
const entry = (day, o = {}) => ({ work_date: `2026-07-${String(day).padStart(2, '0')}`, start: '07:00', end: '14:00', break_minutes: 60, minutes: 360, worked_minutes: 360, target: 'U-1001 Kunde AG', worksite: 'Bahnhofstrasse 5', status: 'approved', ...o });

test('Stundenzettel: 07:00-14:00 with 60 min break shows 6.00 h, pending is separate', () => {
  const model = M.stundenzettelModel('Arben Krasniqi', '2026-07', [entry(1), entry(2), entry(3, { status: 'submitted' }), entry(4)]);
  assert.equal(model.rows[0][7], '6.00');
  assert.equal(model.totalRow[7], '18.00');
  assert.equal(model.meta.find(([k]) => k === 'Noch nicht genehmigt')[1], '6.00');
  assert.equal(model.meta.find(([k]) => k === 'davon Samstag')[1], '6.00');
  const pdf = R.renderPdf(model, '01.08.2026 10:00');
  assert.ok(text(pdf).startsWith('%PDF-'));
  assert.ok(text(pdf).includes('Stundenzettel'));
  assert.ok(text(pdf).includes('Arben Krasniqi'));
});

test('long tables paginate with repeated headers and page numbers', () => {
  const many = Array.from({ length: 80 }, (_, i) => entry((i % 28) + 1));
  const pdf = R.renderPdf(M.stundenzettelModel('Test', '2026-07', many), 'x');
  assert.ok(pages(pdf) >= 3, `pages=${pages(pdf)}`);
  assert.ok(text(pdf).includes('Seite 1 / '));
});

test('weekly team report pivots hours per weekday', () => {
  const model = M.weeklyTeamModel('2026-07-02', [
    { worker: 'B', work_date: '2026-06-29', minutes: 480, status: 'approved' },
    { worker: 'B', work_date: '2026-07-04', minutes: 240, status: 'approved' },
    { worker: 'A', work_date: '2026-06-30', minutes: 450, status: 'submitted' },
    { worker: 'A', work_date: '2026-06-30', minutes: 60, status: 'rejected' },
  ]);
  assert.deepEqual(model.rows[0].slice(0, 3), ['A', '', '7.50']);
  assert.equal(model.rows[1][1], '8.00');
  assert.equal(model.rows[1][6], '4.00');
  assert.equal(model.rows[1][7], '');
  assert.equal(model.rows[1][8], '12.00');
  assert.equal(model.totalRow[8], '19.50');
  assert.ok(R.renderPdf(model, 'x').length > 500);
});

test('monthly company hours with reference difference', () => {
  const model = M.monthlyCompanyModel('2026-07', [
    { worker: 'A', weekdayApproved: 10000, saturdayApproved: 480, submitted: 60, referenceMinutes: 10920 },
  ]);
  assert.deepEqual(model.rows[0], ['A', '166.67', '8.00', '174.67', '1.00', '182.00', '-7.33']);
});

test('Saturday statement sums exactly and separates paid/open', () => {
  const model = M.saturdayStatementModel('Juli 2026', [
    { work_date: '2026-07-04', worker: 'A', minutes: 480, hourly_rate: '30.00', amount: '240.00', status: 'paid' },
    { work_date: '2026-07-11', worker: 'A', minutes: 440, hourly_rate: '35.00', amount: '256.67', status: 'approved' },
  ], '2026-07');
  assert.equal(model.totalRow[4], '496.67');
  assert.equal(model.meta.find(([k]) => k === 'Offen CHF')[1], '256.67');
  assert.equal(model.meta.find(([k]) => k === 'Davon bar bezahlt CHF')[1], '240.00');
});

test('project labor cost model and CSV export', () => {
  const s = { key: 'k', label: 'U-1', workedMinutes: 480, billableMinutes: 480, saturdayMinutes: 0, revenue: 368000000n, laborCost: 400000000n, saturdayCost: 0n, expenses: 0n, margin: -32000000n, marginPercent: -8695000n, revenuePerHour: null, costPerHour: null };
  const model = M.projectLaborCostModel('2026-07', 'Auftrag', [s], s);
  assert.deepEqual(model.rows[0].slice(0, 4), ['U-1', '8.00', '8.00', '368.00']);
  assert.equal(model.rows[0][6], '-32.00');
  assert.equal(model.rows[0][7], '-8.7 %');
  const csv = R.renderCsv(model);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv.trim().split('\r\n').length, 3);
  assert.ok(R.renderPdf(model, 'x').length > 500);
});

test('cash receipt includes signature lines and exact total', () => {
  const model = M.cashReceiptModel({ receiptNumber: 'BQ-2026-00001', worker: 'Arben', paymentDate: '2026-07-31', method: 'cash', reference: null, confirmedAt: null, confirmedVia: null, payments: [{ work_date: '2026-07-04', minutes: 480, hourly_rate: '30.00', amount: '240.00' }, { work_date: '2026-07-11', minutes: 60, hourly_rate: '30.00', amount: '30.00' }] });
  assert.equal(model.totalRow[3], '270.00');
  assert.equal(model.signatures.length, 2);
  const pdf = text(R.renderPdf(model, 'x'));
  assert.ok(pdf.includes('BQ-2026-00001'));
  assert.ok(pdf.includes('Empfangsbest'));
});
