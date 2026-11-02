/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory stand-in for src/lib/supabase.ts used ONLY by the mock-backed UI smoke test.
 * It does not enforce RLS or database rules (those are covered by supabase/tests/*.sql).
 */
type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null; count?: number };

const w = window as any;
w.__calls = [] as { fn: string; args: any }[];
const role: string = new URLSearchParams(location.search).get('role') || localStorage.getItem('mock_role') || 'worker';
const USER_ID = 'u-' + role;

const uid = () => crypto.randomUUID();
const seed = (): Record<string, Row[]> => ({
  users: [
    { id: 'u-worker', role: 'worker', is_active: true, full_name: 'Arben Krasniqi', email: 'arben@example.com', worker_id: 'w1' },
    { id: 'u-team_leader', role: 'team_leader', is_active: true, full_name: 'Besnik Vorarbeiter', email: 'b@example.com', worker_id: 'w2' },
    { id: 'u-admin', role: 'admin', is_active: true, full_name: 'Admin', email: 'admin@example.com', worker_id: null },
    { id: 'u-finance', role: 'finance', is_active: true, full_name: 'Fina Nce', email: 'f@example.com', worker_id: null },
    { id: 'u-project_manager', role: 'project_manager', is_active: true, full_name: 'Pia Manager', email: 'p@example.com', worker_id: null },
  ],
  workers: [
    { id: 'w1', full_name: 'Arben Krasniqi', is_active: true },
    { id: 'w2', full_name: 'Besnik Vorarbeiter', is_active: true },
  ],
  clients: [{ id: 'c1', company_name: 'Kunde AG', is_unterakkord_client: true, billing_hourly_rate: null, billing_saturday_rate: null }],
  subcontract_assignments: [{
    id: 'a1', assignment_number: 'U-1001', client_id: 'c1', title: 'Fassade', worksite_address: 'Bahnhofstrasse 5, Zürich', team_leader_worker_id: 'w2',
    start_date: '2026-07-01', end_date: null, planned_daily_minutes: 480, status: 'active', notes: null,
    clients: { company_name: 'Kunde AG' }, assignment_billing: { hourly_rate: null, saturday_rate: null, billing_status: 'open', invoice_reference: null },
    assignment_workers: [{ id: 'aw1', worker_id: 'w1', valid_from: null, valid_to: null, workers: { full_name: 'Arben Krasniqi' } }],
  }],
  worker_time_entries: [
    { id: 't1', worker_user_id: 'u-worker', worker_id: 'w1', work_date: '2026-07-01', start_at: '2026-07-01T05:00:00Z', end_at: '2026-07-01T12:00:00Z', break_minutes: 60, worked_minutes: 360, approved_minutes: null, billable_minutes: null, billing_rate: null, status: 'submitted', assignment_id: 'a1', project_id: null, worksite: 'Bahnhofstrasse 5', work_description: 'Gerüstaufbau', comment: null, source: 'portal', is_saturday: false, super_admin_comment: null, workers: { full_name: 'Arben Krasniqi' }, subcontract_assignments: { assignment_number: 'U-1001', client_id: 'c1' }, projects: null },
    { id: 't2', worker_user_id: 'u-worker', worker_id: 'w1', work_date: '2026-07-04', start_at: '2026-07-04T05:00:00Z', end_at: '2026-07-04T13:00:00Z', break_minutes: 60, worked_minutes: 420, approved_minutes: 420, billable_minutes: 420, billing_rate: '46.00', status: 'approved', assignment_id: 'a1', project_id: null, worksite: 'Bahnhofstrasse 5', work_date_note: null, work_description: null, comment: null, source: 'portal', is_saturday: true, super_admin_comment: null, workers: { full_name: 'Arben Krasniqi' }, subcontract_assignments: { assignment_number: 'U-1001', client_id: 'c1' }, projects: null },
  ],
  saturday_payments: [
    { id: 's1', worker_id: 'w1', time_entry_id: 't2', work_date: '2026-07-04', minutes: 420, hourly_rate: '30.00', amount: '210.00', payroll_classification: 'saturday_supplement', status: 'approved', payment_date: null, payment_method: null, receipt_id: null, notes: null, workers: { full_name: 'Arben Krasniqi' }, cash_receipts: null },
  ],
  cash_receipts: [],
  daily_reports: [{ id: 'r1', created_by: 'u-worker', uploader_worker_id: 'w1', assignment_id: 'a1', project_id: null, report_date: '2026-07-01', document_number: 'R-5', external_company: null, team_leader_name: null, notes: null, report_kind: 'group', status: 'needs_review', extraction_status: 'succeeded', extraction_error: null, lines_from_ai: true, duplicate_of: null, duplicate_signals: [{ type: 'same_file_hash', strength: 'strong', report_id: 'r0', detail: 'Identische Bilddatei' }], duplicate_resolution: 'pending', review_comment: null, created_at: '2026-07-01T10:00:00Z', workers: { full_name: 'Arben Krasniqi' }, subcontract_assignments: { assignment_number: 'U-1001' }, projects: null }],
  daily_report_lines: [
    { id: 'l1', report_id: 'r1', line_no: 1, worker_id: 'w1', worker_name_raw: 'Arben Krasniqi', start_time: '07:00:00', end_time: '14:00:00', break_minutes: 60, reported_total_minutes: 360, computed_minutes: 360, confidence: 0.95, flags: [], source: 'ai', verified: false, resolution: null, time_entry_id: null, notes: null },
    { id: 'l2', report_id: 'r1', line_no: 2, worker_id: null, worker_name_raw: 'Unbekannt', start_time: '07:00:00', end_time: '16:00:00', break_minutes: 60, reported_total_minutes: 360, computed_minutes: 480, confidence: 0.5, flags: ['unmatched_worker', 'low_confidence'], source: 'ai', verified: false, resolution: null, time_entry_id: null, notes: null },
  ],
  daily_report_files: [],
  leave_requests: [{ id: 'lv1', worker_user_id: 'u-worker', worker_id: 'w1', request_type: 'annual_leave', requested_start_date: '2026-07-20', requested_end_date: '2026-07-24', status: 'pending', admin_counter_start_date: null, admin_counter_end_date: null, worker_comment: 'Sommerferien', admin_comment: null, created_at: '2026-07-01T00:00:00Z', workers: { full_name: 'Arben Krasniqi' } }],
  user_notifications: [{ id: 'n1', user_id: 'u-worker', type: 'hours', title: 'Stunden genehmigt', message: 'Deine Stunden vom 04.07. wurden genehmigt.', link: null, read_at: null, created_at: '2026-07-05T08:00:00Z' }],
  worker_salary_config: [{ id: 'sc1', worker_id: 'w1', monthly_gross_salary: '5000.00', contract_type: 'monthly_fixed', monthly_reference_hours: '182', saturday_hourly_rate: '30.00', saturday_payroll_classification: 'saturday_supplement', employer_cost_percent: null, employer_cost_applies_to_saturday: true, is_active: true, notes: null }],
  worker_monthly_salaries: [],
  payroll_audit_log: [],
  assignment_expenses: [],
  assignment_workers: [],
});

const db: Record<string, Row[]> = seed();
const rpcs: Record<string, (a: any) => any> = {
  my_worksites: () => [{ kind: 'assignment', id: 'a1', name: 'Kunde AG', assignment_number: 'U-1001', address: 'Bahnhofstrasse 5, Zürich', start_date: '2026-07-01', end_date: null, planned_daily_minutes: 480, team_leader: 'Besnik Vorarbeiter', is_team_leader: false, team: [{ worker_id: 'w1', name: 'Arben Krasniqi' }] }],
  my_reportable_targets: () => [{ kind: 'assignment', id: 'a1', label: 'Kunde AG · U-1001', address: 'Bahnhofstrasse 5, Zürich', is_team_leader: false }],
  my_month_overview: () => ({ month: '2026-07', reference_minutes: 10920, approved_minutes: 420, submitted_minutes: 360, rejected_minutes: 0, saturday_approved_minutes: 420, saturday_submitted_minutes: 0, entries: 2 }),
  submit_time_entry: (a) => { const id = uid(); db.worker_time_entries.push({ id, worker_user_id: USER_ID, worker_id: 'w1', work_date: a.p_date, start_at: `${a.p_date}T${a.p_start}:00+02:00`, end_at: `${a.p_date}T${a.p_end}:00+02:00`, break_minutes: a.p_break_minutes, worked_minutes: 0, approved_minutes: null, billable_minutes: null, billing_rate: null, status: 'submitted', assignment_id: a.p_assignment_id, project_id: null, worksite: a.p_worksite, work_description: a.p_description, comment: a.p_comment, source: 'portal', is_saturday: false, workers: { full_name: 'Arben Krasniqi' }, subcontract_assignments: { assignment_number: 'U-1001', client_id: 'c1' }, projects: null }); return id; },
  approve_time_entries: (a) => { db.worker_time_entries.filter((e) => a.p_ids.includes(e.id)).forEach((e) => { e.status = 'approved'; e.approved_minutes = e.worked_minutes; e.billable_minutes = e.worked_minutes; e.billing_rate = '46.00'; }); return a.p_ids.length; },
  reject_time_entries: (a) => { db.worker_time_entries.filter((e) => a.p_ids.includes(e.id)).forEach((e) => { e.status = 'rejected'; e.super_admin_comment = a.p_comment; }); return a.p_ids.length; },
  create_daily_report: () => { const id = uid(); db.daily_reports.push({ id, created_by: USER_ID, uploader_worker_id: 'w1', assignment_id: 'a1', project_id: null, report_date: '2026-07-02', document_number: null, status: 'draft', extraction_status: 'not_requested', report_kind: 'individual', lines_from_ai: false, duplicate_signals: [], duplicate_resolution: 'none', created_at: new Date().toISOString(), workers: { full_name: 'Arben Krasniqi' }, subcontract_assignments: { assignment_number: 'U-1001' }, projects: null }); return id; },
  submit_daily_report: (a) => { const r = db.daily_reports.find((x) => x.id === a.p_report)!; r.status = 'submitted'; return { status: 'submitted' }; },
  preview_report_approval: () => ({ plan: [{ line_id: 'l1', line_no: 1, worker_id: 'w1', action: 'blocker', reason: 'not_verified', conflict_entry_id: null, conflict_status: null, conflict_start: null, conflict_end: null }, { line_id: 'l2', line_no: 2, worker_id: null, action: 'blocker', reason: 'worker_unresolved', conflict_entry_id: null, conflict_status: null, conflict_start: null, conflict_end: null }], duplicate_pending: true, can_approve: false }),
  mark_saturday_paid: (a) => { db.saturday_payments.filter((p) => a.p_ids.includes(p.id)).forEach((p) => { p.status = 'paid'; p.payment_date = a.p_payment_date; p.receipt_id = 'rc1'; p.cash_receipts = { receipt_number: 'BQ-2026-00001', confirmed_at: null }; }); db.cash_receipts.push({ id: 'rc1', receipt_number: 'BQ-2026-00001', worker_id: 'w1', total_minutes: 420, total_amount: '210.00', payment_date: a.p_payment_date, payment_method: 'cash', payment_reference: null, issued_at: new Date().toISOString(), confirmed_at: null, confirmed_via: null, workers: { full_name: 'Arben Krasniqi' } }); return 'rc1'; },
  set_saturday_payment_status: () => 1,
  decide_leave_request: (a) => { const l = db.leave_requests.find((x) => x.id === a.p_id)!; l.status = a.p_decision === 'approve' ? 'approved' : 'rejected'; },
  leave_conflicts: () => ({ other_absences: [], assignments: [{ id: 'a1', number: 'U-1001', client: 'Kunde AG', start: '2026-07-01', end: null }], team_plans: [], teammates_absent: 0 }),
  leave_balance: () => ({ tracked: true, entitlement: 25, used: 0, remaining: 25 }),
  company_calendar: () => ({ leaves: [{ id: 'lv1', worker_id: 'w1', worker: 'Arben Krasniqi', type: 'annual_leave', status: 'pending', start: '2026-07-20', end: '2026-07-24' }], assignments: [{ id: 'a1', number: 'U-1001', client: 'Kunde AG', address: 'x', start: '2026-07-01', end: null, status: 'active', worker_ids: ['w1'] }], plans: [] }),
  schedule_conflicts: () => [{ type: 'assignment_absence', date: '2026-07-20', detail: 'Arben Krasniqi ist vom 20.07. bis 24.07.2026 abwesend, Auftrag U-1001 ist zugeteilt' }],
  finance_inputs: () => ({
    entries: [
      { id: 't2', work_date: '2026-07-04', status: 'approved', worker_id: 'w1', worker: 'Arben Krasniqi', assignment_id: 'a1', assignment_number: 'U-1001', client_id: 'c1', client: 'Kunde AG', project_id: null, project: null, worked_minutes: 420, approved_minutes: 420, billable_minutes: 420, billing_rate: '46.00', projected_rate: null, is_saturday: true, saturday_amount: '210.00', saturday_rate: '30.00', saturday_minutes: 420, saturday_status: 'approved' },
      { id: 't3', work_date: '2026-07-06', status: 'approved', worker_id: 'w1', worker: 'Arben Krasniqi', assignment_id: 'a1', assignment_number: 'U-1001', client_id: 'c1', client: 'Kunde AG', project_id: null, project: null, worked_minutes: 480, approved_minutes: 480, billable_minutes: 480, billing_rate: '46.00', projected_rate: null, is_saturday: false, saturday_amount: null, saturday_rate: null, saturday_minutes: null, saturday_status: null },
    ],
    salaries: [{ worker_id: 'w1', monthly_gross_salary: '5000.00', employer_cost_percent: null, employer_cost_applies_to_saturday: true, reference_hours: '182', is_active: true }],
    monthly_salaries: [], expenses: [],
  }),
};

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private op: 'select' | 'update' | 'insert' | 'delete' | 'upsert' = 'select';
  private payload: any;
  private lim = Infinity;
  private one = false;
  private maybe = false;
  constructor(private table: string) {}
  select() { return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  in(k: string, vs: any[]) { this.filters.push((r) => vs.includes(r[k])); return this; }
  gte(k: string, v: any) { this.filters.push((r) => r[k] >= v); return this; }
  lt(k: string, v: any) { this.filters.push((r) => r[k] < v); return this; }
  lte(k: string, v: any) { this.filters.push((r) => r[k] <= v); return this; }
  not(k: string, _op: string, v: any) { this.filters.push((r) => (r[k] ?? null) !== v); return this; }
  order() { return this; }
  limit(n: number) { this.lim = n; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  insert(p: Row) { this.op = 'insert'; this.payload = p; return this; }
  upsert(p: Row) { this.op = 'upsert'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  single() { this.one = true; return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  gt(k: string, v: any) { this.filters.push((r) => r[k] > v); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  or() { return this; }
  range() { return this; }
  ilike() { return this; }
  maybeSingle() { this.maybe = true; this.one = true; return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(resolve: (r: Result) => any, reject?: (e: any) => any) { return Promise.resolve(this.run()).then(resolve, reject); }
  private run(): Result {
    const rows = (db[this.table] ||= []);
    w.__calls.push({ fn: `${this.op}:${this.table}`, args: this.payload ?? null });
    const matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === 'update') { matched.forEach((r) => Object.assign(r, this.payload)); return this.out(matched); }
    if (this.op === 'insert' || this.op === 'upsert') { const list = Array.isArray(this.payload) ? this.payload : [this.payload]; const made = list.map((p) => ({ id: uid(), ...p })); rows.push(...made); return this.out(made); }
    if (this.op === 'delete') { db[this.table] = rows.filter((r) => !matched.includes(r)); return this.out(matched); }
    return this.out(matched.slice(0, this.lim));
  }
  private out(list: Row[]): Result {
    if (this.one) return list[0] ? { data: list[0], error: null } : this.maybe ? { data: null, error: null } : { data: null, error: { message: 'Not found' } };
    return { data: list, error: null };
  }
}

const listeners: ((e: string) => void)[] = [];
const session = () => (localStorage.getItem('mock_signed_out') ? null : { user: { id: USER_ID, email: `${role}@example.com` } });

export const supabase = {
  from: (t: string) => new Query(t),
  rpc: async (fn: string, args: any = {}) => {
    w.__calls.push({ fn: `rpc:${fn}`, args });
    const impl = rpcs[fn];
    if (!impl) return { data: null, error: { message: `Mock: RPC ${fn} nicht implementiert` } };
    try { return { data: impl(args), error: null }; } catch (e) { return { data: null, error: { message: (e as Error).message } }; }
  },
  auth: {
    getSession: async () => ({ data: { session: session() }, error: null }),
    getUser: async () => ({ data: { user: session()?.user ?? null }, error: null }),
    onAuthStateChange: (cb: (e: string) => void) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async () => ({ data: {}, error: null }),
    signOut: async () => { localStorage.setItem('mock_signed_out', '1'); listeners.forEach((l) => l('SIGNED_OUT')); return { error: null }; },
  },
  storage: {
    from: () => ({
      upload: async (path: string, file: Blob) => { w.__calls.push({ fn: 'storage.upload', args: { path, size: file.size } }); return { data: { path }, error: null }; },
      createSignedUrl: async () => ({ data: { signedUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }, error: null }),
    }),
  },
  functions: { invoke: async (name: string, opts: any) => { w.__calls.push({ fn: `invoke:${name}`, args: opts?.body }); return { data: { status: 'not_configured' }, error: null }; } },
  channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }),
  removeChannel: () => undefined,
};
export default supabase;
