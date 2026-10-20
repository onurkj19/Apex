import supabase from '@/lib/supabase';

/** Surfaces the German message raised by database functions instead of a generic error. */
export class ApiError extends Error {}

const unwrap = <T,>(result: { data: T | null; error: { message: string } | null }, fallback: T): T => {
  if (result.error) throw new ApiError(result.error.message);
  return (result.data ?? fallback) as T;
};

const rpc = async <T,>(fn: string, args: Record<string, unknown> = {}, fallback: T = null as T): Promise<T> =>
  unwrap(await supabase.rpc(fn, args), fallback);

const currentUserId = async (): Promise<string> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new ApiError('Nicht angemeldet.');
  return data.user.id;
};

export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface Worksite {
  kind: 'assignment' | 'project';
  id: string;
  name: string;
  assignment_number: string | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  planned_daily_minutes: number | null;
  team_leader: string | null;
  is_team_leader: boolean;
  team: { worker_id: string; name: string }[];
}

export interface Target {
  kind: 'assignment' | 'project';
  id: string;
  label: string;
  address?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_team_leader?: boolean;
}

export interface TimeEntryRow {
  id: string;
  worker_user_id: string;
  worker_id: string | null;
  work_date: string;
  start_at: string;
  end_at: string | null;
  break_minutes: number;
  worked_minutes: number | null;
  approved_minutes: number | null;
  billable_minutes: number | null;
  billing_rate: string | number | null;
  status: 'running' | 'submitted' | 'approved' | 'rejected';
  assignment_id: string | null;
  project_id: string | null;
  worksite: string | null;
  work_description: string | null;
  comment: string | null;
  source: string | null;
  is_saturday: boolean | null;
  super_admin_comment: string | null;
  workers?: { full_name: string } | null;
  subcontract_assignments?: { assignment_number: string; client_id: string } | null;
  projects?: { project_name: string } | null;
}

export interface MonthOverview {
  month: string;
  reference_minutes: number;
  approved_minutes: number;
  submitted_minutes: number;
  rejected_minutes: number;
  saturday_approved_minutes: number;
  saturday_submitted_minutes: number;
  entries: number;
}

export interface SaturdayPaymentRow {
  id: string;
  worker_id: string;
  time_entry_id: string;
  work_date: string;
  minutes: number;
  hourly_rate: string | number;
  amount: string | number;
  payroll_classification: string;
  status: 'pending' | 'approved' | 'unpaid' | 'paid';
  payment_date: string | null;
  payment_method: string | null;
  receipt_id: string | null;
  notes: string | null;
  workers?: { full_name: string } | null;
  cash_receipts?: { receipt_number: string; confirmed_at: string | null } | null;
}

export interface CashReceiptRow {
  id: string;
  receipt_number: string;
  worker_id: string;
  total_minutes: number;
  total_amount: string | number;
  payment_date: string;
  payment_method: string;
  payment_reference: string | null;
  issued_at: string;
  confirmed_at: string | null;
  confirmed_via: string | null;
  workers?: { full_name: string } | null;
}

export interface DailyReportRow {
  id: string;
  created_by: string;
  uploader_worker_id: string | null;
  assignment_id: string | null;
  project_id: string | null;
  report_date: string;
  document_number: string | null;
  external_company: string | null;
  team_leader_name: string | null;
  notes: string | null;
  report_kind: 'individual' | 'group';
  status: 'draft' | 'submitted' | 'needs_review' | 'approved' | 'rejected' | 'duplicate';
  extraction_status: string;
  extraction_error: string | null;
  lines_from_ai: boolean;
  duplicate_of: string | null;
  duplicate_signals: DuplicateSignal[];
  duplicate_resolution: string;
  review_comment: string | null;
  created_at: string;
  workers?: { full_name: string } | null;
  subcontract_assignments?: { assignment_number: string } | null;
  projects?: { project_name: string } | null;
}

export interface DuplicateSignal {
  type: string;
  strength: 'strong' | 'weak' | 'info';
  report_id?: string;
  detail?: string;
}

export interface ReportLineRow {
  id: string;
  report_id: string;
  line_no: number;
  worker_id: string | null;
  worker_name_raw: string | null;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  reported_total_minutes: number | null;
  computed_minutes: number | null;
  confidence: number | null;
  flags: string[];
  source: 'ai' | 'manual';
  verified: boolean;
  resolution: string | null;
  time_entry_id: string | null;
  notes: string | null;
}

export interface ReportFileRow {
  id: string;
  report_id: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  sha256: string | null;
  page_no: number;
}

export interface ApprovalPlanItem {
  line_id: string;
  line_no: number;
  worker_id: string | null;
  action: 'create' | 'already' | 'skip' | 'link' | 'replace' | 'blocker';
  reason: string | null;
  conflict_entry_id: string | null;
  conflict_status: string | null;
  conflict_start: string | null;
  conflict_end: string | null;
}

export interface ApprovalPreview {
  plan: ApprovalPlanItem[];
  duplicate_pending: boolean;
  can_approve: boolean;
}

// ---------------------------------------------------------------------------
// Worker portal
// ---------------------------------------------------------------------------
const ENTRY_SELECT =
  '*, workers(full_name), subcontract_assignments(assignment_number, client_id), projects(project_name)';

export const portalApi = {
  worksites: (date: string) => rpc<Worksite[]>('my_worksites', { p_date: date }, []),
  targets: () => rpc<Target[]>('my_reportable_targets', {}, []),
  overview: (month: string) => rpc<MonthOverview | null>('my_month_overview', { p_month: `${month}-01` }, null),

  async myEntries(month: string): Promise<TimeEntryRow[]> {
    const userId = await currentUserId();
    const from = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    return unwrap(
      await supabase
        .from('worker_time_entries')
        .select(ENTRY_SELECT)
        .eq('worker_user_id', userId)
        .gte('work_date', from)
        .lt('work_date', to)
        .not('end_at', 'is', null)
        .order('work_date', { ascending: false })
        .order('start_at', { ascending: false }),
      [],
    ) as unknown as TimeEntryRow[];
  },

  submitEntry: (p: {
    date: string; start: string; end: string; breakMinutes: number; target: Target | null;
    worksite: string; description: string; comment: string;
  }) =>
    rpc<string>('submit_time_entry', {
      p_date: p.date,
      p_start: p.start,
      p_end: p.end,
      p_break_minutes: p.breakMinutes,
      p_assignment_id: p.target?.kind === 'assignment' ? p.target.id : null,
      p_project_id: p.target?.kind === 'project' ? p.target.id : null,
      p_worksite: p.worksite,
      p_description: p.description,
      p_comment: p.comment || null,
    }),

  updateEntry: (p: { id: string; start: string; end: string; breakMinutes: number; worksite: string; description: string; comment: string }) =>
    rpc<void>('update_my_time_entry', {
      p_id: p.id, p_start: p.start, p_end: p.end, p_break_minutes: p.breakMinutes,
      p_worksite: p.worksite, p_description: p.description, p_comment: p.comment || null,
    }),

  deleteEntry: (id: string) => rpc<void>('delete_my_time_entry', { p_id: id }),

  async saturdayPayments(month: string): Promise<SaturdayPaymentRow[]> {
    const from = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    return unwrap(
      await supabase
        .from('saturday_payments')
        .select('*, cash_receipts(receipt_number, confirmed_at)')
        .gte('work_date', from)
        .lt('work_date', to)
        .order('work_date', { ascending: false }),
      [],
    ) as unknown as SaturdayPaymentRow[];
  },

  async myReceipts(): Promise<CashReceiptRow[]> {
    return unwrap(
      await supabase.from('cash_receipts').select('*, workers(full_name)').order('issued_at', { ascending: false }).limit(24),
      [],
    ) as unknown as CashReceiptRow[];
  },

  confirmReceipt: (receiptId: string, name: string) => rpc<void>('confirm_cash_receipt', { p_receipt: receiptId, p_confirmed_name: name }),

  async notifications() {
    return unwrap(
      await supabase.from('user_notifications').select('*').order('created_at', { ascending: false }).limit(50),
      [],
    ) as { id: string; type: string; title: string; message: string; link: string | null; read_at: string | null; created_at: string }[];
  },

  async markNotificationRead(id: string) {
    unwrap(await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id), null);
  },
};

// ---------------------------------------------------------------------------
// Daily reports
// ---------------------------------------------------------------------------
const REPORT_SELECT = '*, workers:uploader_worker_id(full_name), subcontract_assignments(assignment_number), projects(project_name)';

export const sha256Hex = async (data: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const reportsApi = {
  create: (p: { target: Target; date: string; documentNumber?: string; idempotencyKey: string }) =>
    rpc<string>('create_daily_report', {
      p_assignment_id: p.target.kind === 'assignment' ? p.target.id : null,
      p_project_id: p.target.kind === 'project' ? p.target.id : null,
      p_report_date: p.date,
      p_document_number: p.documentNumber || null,
      p_idempotency_key: p.idempotencyKey,
    }),

  async uploadFile(reportId: string, file: Blob, originalName: string, pageNo = 1): Promise<ReportFileRow> {
    const userId = await currentUserId();
    const buffer = await file.arrayBuffer();
    const hash = await sha256Hex(buffer);
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${userId}/${reportId}/${hash.slice(0, 16)}-${pageNo}.${ext}`;
    const upload = await supabase.storage.from('daily-reports').upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error && !/already exists|Duplicate/i.test(upload.error.message)) throw new ApiError(upload.error.message);
    const existing = await supabase.from('daily_report_files').select('*').eq('storage_path', path).maybeSingle();
    if (existing.data) return existing.data as ReportFileRow;
    return unwrap(
      await supabase
        .from('daily_report_files')
        .insert({ report_id: reportId, storage_path: path, original_name: originalName, mime_type: file.type, size_bytes: file.size, sha256: hash, page_no: pageNo })
        .select('*')
        .single(),
      null as unknown as ReportFileRow,
    );
  },

  async signedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from('daily-reports').createSignedUrl(path, 300);
    if (error || !data) throw new ApiError(error?.message ?? 'Link nicht verfügbar.');
    return data.signedUrl;
  },

  async extract(reportId: string): Promise<{ status: string; error?: string; lines?: number }> {
    const { data, error } = await supabase.functions.invoke('extract-tagesrapport', { body: { report_id: reportId } });
    if (error) throw new ApiError('KI-Auswertung nicht erreichbar. Die Stunden können manuell erfasst werden.');
    return data as { status: string; error?: string; lines?: number };
  },

  async get(id: string) {
    const [report, lines, files] = await Promise.all([
      supabase.from('daily_reports').select(REPORT_SELECT).eq('id', id).single(),
      supabase.from('daily_report_lines').select('*').eq('report_id', id).order('line_no'),
      supabase.from('daily_report_files').select('*').eq('report_id', id).order('page_no'),
    ]);
    return {
      report: unwrap(report, null as unknown as DailyReportRow) as unknown as DailyReportRow,
      lines: unwrap(lines, []) as unknown as ReportLineRow[],
      files: unwrap(files, []) as unknown as ReportFileRow[],
    };
  },

  async list(statuses?: string[], mineOnly = false): Promise<DailyReportRow[]> {
    let q = supabase.from('daily_reports').select(REPORT_SELECT).order('report_date', { ascending: false }).order('created_at', { ascending: false }).limit(200);
    if (statuses && statuses.length > 0) q = q.in('status', statuses);
    if (mineOnly) q = q.eq('created_by', await currentUserId());
    return unwrap(await q, []) as unknown as DailyReportRow[];
  },

  async saveLine(line: Partial<ReportLineRow> & { report_id: string; line_no: number }): Promise<ReportLineRow> {
    const payload = {
      report_id: line.report_id,
      line_no: line.line_no,
      worker_id: line.worker_id ?? null,
      worker_name_raw: line.worker_name_raw ?? null,
      start_time: line.start_time || null,
      end_time: line.end_time || null,
      break_minutes: line.break_minutes ?? 0,
      reported_total_minutes: line.reported_total_minutes ?? null,
      verified: line.verified ?? false,
      notes: line.notes ?? null,
    };
    if (line.id) {
      return unwrap(await supabase.from('daily_report_lines').update(payload).eq('id', line.id).select('*').single(), null as unknown as ReportLineRow);
    }
    return unwrap(await supabase.from('daily_report_lines').insert({ ...payload, source: 'manual' }).select('*').single(), null as unknown as ReportLineRow);
  },

  async deleteLine(id: string) {
    unwrap(await supabase.from('daily_report_lines').delete().eq('id', id), null);
  },

  async updateHeader(id: string, patch: { document_number?: string | null; external_company?: string | null; team_leader_name?: string | null; notes?: string | null }) {
    unwrap(await supabase.from('daily_reports').update(patch).eq('id', id), null);
  },

  submit: (id: string) => rpc<{ status: string; signals?: DuplicateSignal[] }>('submit_daily_report', { p_report: id }),
  preview: (id: string) => rpc<ApprovalPreview>('preview_report_approval', { p_report: id }),
  resolveLine: (lineId: string, action: string | null, comment?: string) => rpc<void>('resolve_report_line', { p_line: lineId, p_action: action, p_comment: comment ?? null }),
  resolveDuplicate: (id: string, resolution: 'discard_this' | 'discard_other' | 'keep_both', comment?: string) =>
    rpc<void>('resolve_report_duplicate', { p_report: id, p_resolution: resolution, p_comment: comment ?? null }),
  approve: (id: string, comment?: string) => rpc<Record<string, number>>('approve_daily_report', { p_report: id, p_comment: comment ?? null }),
  reject: (id: string, comment: string) => rpc<void>('reject_daily_report', { p_report: id, p_comment: comment }),
};

// ---------------------------------------------------------------------------
// Admin: hours, Saturday, payroll, Unterakkord, leave, calendar, finance
// ---------------------------------------------------------------------------
export const hoursApi = {
  async list(filter: { status?: string; from?: string; to?: string; assignmentId?: string; workerId?: string }): Promise<TimeEntryRow[]> {
    let q = supabase.from('worker_time_entries').select(ENTRY_SELECT).not('end_at', 'is', null).order('work_date', { ascending: false }).order('start_at').limit(500);
    if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status);
    if (filter.from) q = q.gte('work_date', filter.from);
    if (filter.to) q = q.lte('work_date', filter.to);
    if (filter.assignmentId) q = q.eq('assignment_id', filter.assignmentId);
    if (filter.workerId) q = q.eq('worker_id', filter.workerId);
    return unwrap(await q, []) as unknown as TimeEntryRow[];
  },
  approve: (ids: string[], comment?: string) => rpc<number>('approve_time_entries', { p_ids: ids, p_comment: comment ?? null }),
  reject: (ids: string[], comment: string) => rpc<number>('reject_time_entries', { p_ids: ids, p_comment: comment }),
  adjust: (p: { id: string; approved: number; billable: number; rate: string | null; reason: string }) =>
    rpc<void>('adjust_time_entry_minutes', { p_id: p.id, p_approved_minutes: p.approved, p_billable_minutes: p.billable, p_billing_rate: p.rate, p_reason: p.reason }),
  adminCreate: (p: { workerId: string; date: string; start: string; end: string; breakMinutes: number; target: Target | null; worksite: string; description: string; comment?: string }) =>
    rpc<string>('admin_create_time_entry', {
      p_worker_id: p.workerId, p_date: p.date, p_start: p.start, p_end: p.end, p_break_minutes: p.breakMinutes,
      p_assignment_id: p.target?.kind === 'assignment' ? p.target.id : null,
      p_project_id: p.target?.kind === 'project' ? p.target.id : null,
      p_worksite: p.worksite, p_description: p.description, p_comment: p.comment ?? null,
    }),
};

export const saturdayApi = {
  async list(filter: { status?: string; from?: string; to?: string }): Promise<SaturdayPaymentRow[]> {
    let q = supabase.from('saturday_payments').select('*, workers(full_name), cash_receipts(receipt_number, confirmed_at)').order('work_date', { ascending: false }).limit(500);
    if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status);
    if (filter.from) q = q.gte('work_date', filter.from);
    if (filter.to) q = q.lte('work_date', filter.to);
    return unwrap(await q, []) as unknown as SaturdayPaymentRow[];
  },
  setStatus: (ids: string[], status: 'approved' | 'unpaid', note?: string) => rpc<number>('set_saturday_payment_status', { p_ids: ids, p_status: status, p_note: note ?? null }),
  updateRate: (id: string, rate: string, classification: string, reason: string) =>
    rpc<void>('update_saturday_payment_rate', { p_id: id, p_rate: Number(rate), p_classification: classification, p_reason: reason }),
  markPaid: (ids: string[], date: string, idempotencyKey: string, reference?: string, notes?: string) =>
    rpc<string>('mark_saturday_paid', { p_ids: ids, p_payment_date: date, p_method: 'cash', p_reference: reference ?? null, p_idempotency_key: idempotencyKey, p_notes: notes ?? null }),
  async receipts(): Promise<CashReceiptRow[]> {
    return unwrap(await supabase.from('cash_receipts').select('*, workers(full_name)').order('issued_at', { ascending: false }).limit(200), []) as unknown as CashReceiptRow[];
  },
  async receiptPayments(receiptId: string) {
    return unwrap(await supabase.from('saturday_payments').select('work_date, minutes, hourly_rate, amount').eq('receipt_id', receiptId).order('work_date'), []) as { work_date: string; minutes: number; hourly_rate: string; amount: string }[];
  },
  confirmPaper: (receiptId: string, name: string) => rpc<void>('confirm_cash_receipt', { p_receipt: receiptId, p_confirmed_name: name }),
};

export interface SalaryConfigRow {
  id?: string;
  worker_id: string;
  monthly_gross_salary: string | number | null;
  contract_type: string;
  monthly_reference_hours: string | number;
  saturday_hourly_rate: string | number;
  saturday_payroll_classification: string;
  employer_cost_percent: string | number | null;
  employer_cost_applies_to_saturday: boolean;
  is_active: boolean;
  notes: string | null;
}

export const payrollApi = {
  async configs(): Promise<SalaryConfigRow[]> {
    return unwrap(await supabase.from('worker_salary_config').select('*'), []) as unknown as SalaryConfigRow[];
  },
  async saveConfig(row: SalaryConfigRow) {
    const { id: _id, ...rest } = row;
    unwrap(await supabase.from('worker_salary_config').upsert({ ...rest, updated_by: await currentUserId() }, { onConflict: 'worker_id' }), null);
  },
  async monthlySalaries(month: string) {
    return unwrap(await supabase.from('worker_monthly_salaries').select('*').eq('salary_month', `${month}-01`), []) as { worker_id: string; gross_salary: string | number; notes: string | null }[];
  },
  async saveMonthlySalary(workerId: string, month: string, gross: string, notes?: string) {
    unwrap(await supabase.from('worker_monthly_salaries').upsert({ worker_id: workerId, salary_month: `${month}-01`, gross_salary: Number(gross), notes: notes ?? null, entered_by: await currentUserId() }, { onConflict: 'worker_id,salary_month' }), null);
  },
  async audit(limit = 100) {
    return unwrap(await supabase.from('payroll_audit_log').select('*').order('created_at', { ascending: false }).limit(limit), []) as { id: string; created_at: string; table_name: string; record_id: string | null; operation: string; actor: string | null; old_data: unknown; new_data: unknown }[];
  },
  async workers() {
    return unwrap(await supabase.from('workers').select('id, full_name, is_active').order('full_name'), []) as { id: string; full_name: string; is_active: boolean }[];
  },
};

export interface ClientRow {
  id: string;
  company_name: string;
  is_unterakkord_client: boolean;
  billing_hourly_rate: string | number | null;
  billing_saturday_rate: string | number | null;
}

export interface AssignmentRow {
  id: string;
  assignment_number: string;
  client_id: string;
  title: string | null;
  worksite_address: string;
  team_leader_worker_id: string | null;
  start_date: string;
  end_date: string | null;
  planned_daily_minutes: number | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  notes: string | null;
  clients?: { company_name: string } | null;
  assignment_billing?: { hourly_rate: string | number | null; saturday_rate: string | number | null; billing_status: string; invoice_reference: string | null } | null;
  assignment_workers?: { id: string; worker_id: string; valid_from: string | null; valid_to: string | null; workers?: { full_name: string } | null }[];
}

export const unterakkordApi = {
  async clients(): Promise<ClientRow[]> {
    return unwrap(await supabase.from('clients').select('id, company_name, is_unterakkord_client, billing_hourly_rate, billing_saturday_rate').order('company_name'), []) as unknown as ClientRow[];
  },
  async saveClientBilling(id: string, patch: { is_unterakkord_client: boolean; billing_hourly_rate: string | null; billing_saturday_rate: string | null }) {
    unwrap(await supabase.from('clients').update({
      is_unterakkord_client: patch.is_unterakkord_client,
      billing_hourly_rate: patch.billing_hourly_rate === null || patch.billing_hourly_rate === '' ? null : Number(patch.billing_hourly_rate),
      billing_saturday_rate: patch.billing_saturday_rate === null || patch.billing_saturday_rate === '' ? null : Number(patch.billing_saturday_rate),
    }).eq('id', id), null);
  },
  async assignments(): Promise<AssignmentRow[]> {
    return unwrap(
      await supabase.from('subcontract_assignments')
        .select('*, clients(company_name), assignment_billing(hourly_rate, saturday_rate, billing_status, invoice_reference), assignment_workers(id, worker_id, valid_from, valid_to, workers(full_name))')
        .order('start_date', { ascending: false }),
      [],
    ) as unknown as AssignmentRow[];
  },
  async saveAssignment(row: Partial<AssignmentRow> & { assignment_number: string; client_id: string; worksite_address: string; start_date: string }) {
    const payload = {
      assignment_number: row.assignment_number.trim(),
      client_id: row.client_id,
      title: row.title || null,
      worksite_address: row.worksite_address.trim(),
      team_leader_worker_id: row.team_leader_worker_id || null,
      start_date: row.start_date,
      end_date: row.end_date || null,
      planned_daily_minutes: row.planned_daily_minutes ?? null,
      status: row.status ?? 'planned',
      notes: row.notes || null,
    };
    if (row.id) {
      unwrap(await supabase.from('subcontract_assignments').update(payload).eq('id', row.id), null);
      return row.id;
    }
    const created = unwrap(await supabase.from('subcontract_assignments').insert({ ...payload, created_by: await currentUserId() }).select('id').single(), null as unknown as { id: string });
    return created.id;
  },
  async saveBilling(assignmentId: string, patch: { hourly_rate: string | null; saturday_rate: string | null; billing_status: string; invoice_reference: string | null }) {
    unwrap(await supabase.from('assignment_billing').upsert({
      assignment_id: assignmentId,
      hourly_rate: patch.hourly_rate ? Number(patch.hourly_rate) : null,
      saturday_rate: patch.saturday_rate ? Number(patch.saturday_rate) : null,
      billing_status: patch.billing_status,
      invoice_reference: patch.invoice_reference || null,
    }, { onConflict: 'assignment_id' }), null);
  },
  async addWorker(assignmentId: string, workerId: string, from?: string, to?: string) {
    unwrap(await supabase.from('assignment_workers').upsert({ assignment_id: assignmentId, worker_id: workerId, valid_from: from || null, valid_to: to || null }, { onConflict: 'assignment_id,worker_id' }), null);
  },
  async removeWorker(id: string) {
    unwrap(await supabase.from('assignment_workers').delete().eq('id', id), null);
  },
  async expenses(assignmentId?: string) {
    let q = supabase.from('assignment_expenses').select('*, subcontract_assignments(assignment_number)').order('expense_date', { ascending: false }).limit(300);
    if (assignmentId) q = q.eq('assignment_id', assignmentId);
    return unwrap(await q, []) as unknown as { id: string; assignment_id: string; expense_date: string; category: string; amount: string | number; description: string | null; subcontract_assignments?: { assignment_number: string } | null }[];
  },
  async addExpense(p: { assignment_id: string; expense_date: string; category: string; amount: string; description: string }) {
    unwrap(await supabase.from('assignment_expenses').insert({ ...p, amount: Number(p.amount), created_by: await currentUserId() }), null);
  },
  async deleteExpense(id: string) {
    unwrap(await supabase.from('assignment_expenses').delete().eq('id', id), null);
  },
};

export interface LeaveConflicts {
  other_absences: { id: string; worker: string | null; type: string; status: string; start: string; end: string }[];
  assignments: { id: string; number: string; client: string; start: string; end: string | null }[];
  team_plans: { id: string; title: string; date: string }[];
  teammates_absent: number;
}

export const leaveApi = {
  async list(status?: string) {
    let q = supabase.from('leave_requests').select('*, workers(full_name)').order('created_at', { ascending: false }).limit(300);
    if (status && status !== 'all') q = q.eq('status', status);
    return unwrap(await q, []) as unknown as {
      id: string; worker_id: string | null; request_type: string; requested_start_date: string; requested_end_date: string; status: string;
      admin_counter_start_date: string | null; admin_counter_end_date: string | null; worker_comment: string | null; admin_comment: string | null; workers?: { full_name: string } | null;
    }[];
  },
  decide: (id: string, decision: 'approve' | 'reject' | 'counter_offer', comment?: string, counter?: { start: string; end: string }) =>
    rpc<void>('decide_leave_request', { p_id: id, p_decision: decision, p_comment: comment ?? null, p_counter_start: counter?.start ?? null, p_counter_end: counter?.end ?? null }),
  conflicts: (id: string) => rpc<LeaveConflicts | null>('leave_conflicts', { p_id: id }, null),
  balance: (workerId: string, year: number) => rpc<{ tracked: boolean; entitlement?: number; used?: number; remaining?: number } | null>('leave_balance', { p_worker: workerId, p_year: year }, null),
};

export interface CalendarData {
  leaves: { id: string; worker_id: string; worker: string | null; type: string; status: string; start: string; end: string }[];
  assignments: { id: string; number: string; client: string; address: string; start: string; end: string | null; status: string; worker_ids: string[] }[];
  plans: { id: string; title: string; date: string; location: string | null; worker_ids: string[]; vehicle: string | null; status: string }[];
}

export const calendarApi = {
  calendar: (from: string, to: string) => rpc<CalendarData>('company_calendar', { p_from: from, p_to: to }, { leaves: [], assignments: [], plans: [] } as CalendarData),
  conflicts: (from: string, to: string) => rpc<{ type: string; date?: string; detail?: string; worker?: string; [k: string]: unknown }[]>('schedule_conflicts', { p_from: from, p_to: to }, []),
};

export const financeApi = {
  inputs: (from: string, to: string) => rpc<import('./finance').FinanceInputs>('finance_inputs', { p_from: from, p_to: to }),
};
