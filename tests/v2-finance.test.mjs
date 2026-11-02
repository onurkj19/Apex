import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const D = await loadTs('src/lib/v2/decimal.ts');
const F = await loadTs('src/lib/v2/finance.ts');
const f = (v) => D.formatDecimal(v);

let n = 0;
const entry = (o) => ({
  id: `e${++n}`, work_date: '2026-07-01', status: 'approved', worker_id: 'w1', worker: 'Arben',
  assignment_id: null, assignment_number: null, client_id: null, client: null, project_id: null, project: null,
  worked_minutes: 480, approved_minutes: null, billable_minutes: null, billing_rate: null, projected_rate: null,
  is_saturday: false, saturday_amount: null, saturday_rate: null, saturday_minutes: null, saturday_status: null, ...o,
});
const base = (entries, extra = {}) => ({
  entries, salaries: [{ worker_id: 'w1', monthly_gross_salary: '5000.00', employer_cost_percent: '0', employer_cost_applies_to_saturday: false, reference_hours: '182', is_active: true }],
  monthly_salaries: [], expenses: [], ...extra,
});
const ua = { assignment_id: 'a1', assignment_number: 'A-1', client_id: 'c1', client: 'Kunde AG', billing_rate: '46.00' };

test('revenue uses the approved snapshot rate, exact to cents', () => {
  const r = F.computeFinance(base([entry({ ...ua, worked_minutes: 450 })]));
  assert.equal(f(r.entries[0].revenue), '345.00');
});

test('salary is allocated once across apex and unterakkord work (no double counting)', () => {
  const entries = [
    entry({ ...ua, work_date: '2026-07-01', worked_minutes: 480 }),
    entry({ project_id: 'p1', project: 'Apex Haus', work_date: '2026-07-02', worked_minutes: 480 }),
    entry({ ...ua, work_date: '2026-07-03', worked_minutes: 480 }),
  ];
  const r = F.computeFinance(base(entries));
  assert.equal(f(F.totalAllocatedLabor(r)), '5000.00');
  assert.equal(f(r.unallocatedSalary), '0.00');
  const uaSummary = F.summarizeUnterakkord(r, 'client')[0];
  const apex = F.summarizeApexProjects(r)[0];
  assert.equal(f(D.add(uaSummary.laborCost, apex.laborCost)), '5000.00');
  assert.equal(f(apex.laborCost), '1666.67');
  assert.equal(f(uaSummary.laborCost), '3333.33');
});

test('fixed salary is not adjusted by hours; per-entry shares sum exactly', () => {
  const few = F.computeFinance(base([entry({ ...ua, worked_minutes: 60 })]));
  const many = F.computeFinance(base([entry({ ...ua, worked_minutes: 4800 })]));
  assert.equal(f(F.totalAllocatedLabor(few)), '5000.00');
  assert.equal(f(F.totalAllocatedLabor(many)), '5000.00');
});

test('saturday work is costed directly and does not absorb salary', () => {
  const entries = [
    entry({ ...ua, work_date: '2026-07-01', worked_minutes: 480 }),
    entry({ ...ua, work_date: '2026-07-04', worked_minutes: 480, is_saturday: true, saturday_amount: '240.00', saturday_rate: '30.00', saturday_minutes: 480, saturday_status: 'approved' }),
  ];
  const r = F.computeFinance(base(entries));
  const [wk, sat] = r.entries;
  assert.equal(f(wk.salaryCost), '5000.00');
  assert.equal(f(sat.salaryCost), '0.00');
  assert.equal(f(sat.saturdayCost), '240.00');
  assert.equal(f(F.totalAllocatedLabor(r)), '5240.00');
  assert.equal(f(sat.revenue), '368.00');
});

test('employer cost percentage applies to salary and optionally to saturday', () => {
  const sal = [{ worker_id: 'w1', monthly_gross_salary: '5000.00', employer_cost_percent: '12.5', employer_cost_applies_to_saturday: true, reference_hours: '182', is_active: true }];
  const entries = [
    entry({ ...ua }),
    entry({ ...ua, work_date: '2026-07-04', is_saturday: true, saturday_amount: '240.00' }),
  ];
  const r = F.computeFinance(base(entries, { salaries: sal }));
  assert.equal(f(r.entries[0].salaryCost), '5625.00');
  assert.equal(f(r.entries[1].saturdayCost), '270.00');
});

test('missing salary is flagged, never invented', () => {
  const r = F.computeFinance(base([entry({ ...ua })], { salaries: [] }));
  assert.equal(f(r.entries[0].laborCost), '0.00');
  assert.ok(r.flags.some((x) => x.code === 'missing_salary'));
});

test('monthly salary override beats the default configuration', () => {
  const r = F.computeFinance(base([entry({ ...ua })], { monthly_salaries: [{ worker_id: 'w1', month: '2026-07-01', gross_salary: '4200.00' }] }));
  assert.equal(f(r.entries[0].laborCost), '4200.00');
});

test('salary with only saturday work is reported as unallocated', () => {
  const r = F.computeFinance(base([entry({ ...ua, is_saturday: true, work_date: '2026-07-04', saturday_amount: '240.00' })]));
  assert.equal(f(r.unallocatedSalary), '5000.00');
  assert.ok(r.flags.some((x) => x.code === 'unallocated_salary'));
});

test('actual (approved) vs estimate (incl. submitted)', () => {
  const entries = [entry({ ...ua }), entry({ ...ua, status: 'submitted', billing_rate: null, projected_rate: '46.00', work_date: '2026-07-02' })];
  const actual = F.computeFinance(base(entries));
  const estimate = F.computeFinance(base(entries), { includeStatuses: ['approved', 'submitted'] });
  assert.equal(actual.entries.length, 1);
  assert.equal(estimate.entries.length, 2);
  assert.equal(estimate.entries[1].rateIsProjected, true);
  assert.equal(f(F.totalAllocatedLabor(estimate)), '5000.00');
});

test('adjusted approved and billable minutes are separate from worked minutes', () => {
  const r = F.computeFinance(base([entry({ ...ua, worked_minutes: 480, approved_minutes: 450, billable_minutes: 420 })]));
  assert.equal(r.entries[0].workedMinutes, 450);
  assert.equal(r.entries[0].billableMinutes, 420);
  assert.equal(f(r.entries[0].revenue), '322.00');
});

test('summaries by employee, client, assignment, week, month, year with expenses and margin', () => {
  const entries = [
    entry({ ...ua, work_date: '2026-07-01' }),
    entry({ ...ua, work_date: '2026-07-08', assignment_id: 'a2', assignment_number: 'A-2' }),
  ];
  const expenses = [{ id: 'x1', assignment_id: 'a1', worker_id: null, date: '2026-07-02', category: 'Material', amount: '100.00', description: null, client_id: 'c1', client: 'Kunde AG', assignment_number: 'A-1' }];
  const r = F.computeFinance(base(entries, { expenses }));
  const byAssignment = F.summarizeUnterakkord(r, 'assignment');
  assert.equal(byAssignment.length, 2);
  const a1 = byAssignment.find((s) => s.label === 'A-1');
  assert.equal(f(a1.expenses), '100.00');
  assert.equal(f(a1.margin), D.formatDecimal(a1.revenue - a1.laborCost - a1.expenses));
  assert.equal(F.summarizeUnterakkord(r, 'week').length, 2);
  assert.equal(F.summarizeUnterakkord(r, 'month').length, 1);
  assert.equal(F.summarizeUnterakkord(r, 'year')[0].label, '2026');
  const total = F.totalOf(F.summarizeUnterakkord(r, 'client'));
  assert.equal(f(total.revenue), '736.00');
  assert.equal(f(total.laborCost), '5000.00');
  assert.equal(f(total.expenses), '100.00');
  assert.equal(f(total.margin), '-4364.00');
  assert.equal(total.revenuePerHour && f(total.revenuePerHour), '46.00');
  assert.equal(F.summarizeUnterakkord(r, 'employee').length, 1);
});

test('empty input yields empty output', () => {
  const r = F.computeFinance(base([]));
  assert.equal(r.entries.length, 0);
  assert.equal(F.summarizeUnterakkord(r, 'client').length, 0);
  assert.equal(f(F.totalOf([]).margin), '0.00');
});
