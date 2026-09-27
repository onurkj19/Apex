export type ProjectStatus =
  | 'Ne pritje'
  | 'I pranuar'
  | 'I refuzuar'
  | 'Ne pune'
  | 'I perfunduar'
  | 'I deshtuar';

export type ContractStatus = 'Active' | 'Failed' | 'Completed';
export type QuoteStatus = 'Draft' | 'Derguar' | 'Pranuar' | 'Perfunduar' | 'Refuzuar';
export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentMethod = 'Cash' | 'Bank';
export type ExpenseCategory = 'Karburant' | 'Pajisje' | 'Blerje Produktesh' | 'Qira Magazine' | 'Mjete Pune';
export type AppRole = 'admin' | 'super_admin' | 'finance' | 'project_manager' | 'viewer' | 'worker';

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  monthly_revenue: number;
  monthly_expenses: number;
  company_balance: number;
}

export interface Project {
  id: string;
  project_name: string;
  client_id: string | null;
  location: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  progress: number;
  revenue: number;
  /** Nëse true, `revenue` është brutto (inkl. MwSt 8.1%); për P/L përdoret neto. */
  revenue_includes_vat_8_1?: boolean;
  worker_cost: number;
  extra_expense: number;
  /** Soft-delete: Recycle Bin; null = aktiv */
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Worker {
  id: string;
  full_name: string;
  hourly_rate: number;
  role: string;
  group_name: string;
  is_active: boolean;
}

export interface WorkerGroup {
  id: string;
  name: string;
  is_active: boolean;
}

export interface FinanceEntry {
  id: string;
  title: string;
  amount: number;
  finance_type: 'income' | 'expense';
  category: ExpenseCategory | null;
  payment_method: PaymentMethod;
  finance_date: string;
  project_id: string | null;
}

export interface WorkLog {
  id: string;
  worker_id: string;
  project_id: string;
  location: string;
  work_date: string;
  hours_worked: number;
  hourly_rate: number;
  total_amount: number;
}

export interface Contract {
  id: string;
  project_id: string | null;
  client_id: string | null;
  contract_title: string | null;
  contract_address: string | null;
  status: ContractStatus;
  contract_file_url: string | null;
  contract_file_path?: string | null;
  expires_at: string | null;
}

export interface InventoryItem {
  id: string;
  category: 'Frames' | 'Platforms' | 'Guardrails' | 'Anchors' | 'Tools';
  item_name: string;
  total_quantity: number;
  used_quantity: number;
  available_quantity: number;
}

export interface Quote {
  id: string;
  project_id: string | null;
  client_id: string | null;
  quote_title?: string | null;
  status?: QuoteStatus;
  quote_file_url?: string | null;
  quote_file_path?: string | null;
  square_meters?: number;
  assembly_price?: number;
  disassembly_price?: number;
  transport_cost?: number;
  total_amount?: number;
  pdf_url?: string | null;
  created_at?: string;
}

export interface Invoice {
  id: string;
  project_id: string | null;
  client_id: string | null;
  invoice_title?: string | null;
  invoice_number: string;
  amount: number;
  issued_at: string;
  due_at: string | null;
  status: InvoiceStatus;
  invoice_file_url?: string | null;
  invoice_file_path?: string | null;
  pdf_url?: string | null;
}

export interface NotificationItem {
  id: string;
  type:
    | 'project_completed'
    | 'contract_expiring'
    | 'large_expense'
    | 'client_created'
    | 'project_created'
    | 'finance_income_created'
    | 'finance_expense_created'
    | 'admin_change';
  title: string;
  message: string;
  is_read: boolean;
  is_archived?: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemSettings {
  darkMode: boolean;
  monthlyEmail: string;
  largeExpenseThreshold: string;
}

export interface AuditLogItem {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

/** Skedar i ngarkuar nga admini pÃ«r njÃ« plan (foto / PDF) me titull. */
export interface TeamPlanAttachment {
  title: string;
  url: string;
  path: string;
  mime?: string;
}

export interface TeamPlanItem {
  id: string;
  title: string;
  plan_date: string;
  plan_type: 'daily' | 'weekly';
  location: string | null;
  task_details: string | null;
  project_id: string | null;
  group_name: string | null;
  worker_ids: string[];
  vehicle_label: string | null;
  trailer_required: boolean;
  /** Legacy njÃ« skedar; prefero `attachments`. */
  attachment_url: string | null;
  attachment_path: string | null;
  /** Lista e dokumenteve/fotove me tituj (JSON nÃ« DB). */
  attachments?: TeamPlanAttachment[] | null;
  notes: string | null;
  status: 'planned' | 'in_progress' | 'done' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export type LeaveRequestType = 'day_off' | 'annual_leave';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'counter_offered' | 'worker_countered';

export interface LeaveRequest {
  id: string;
  worker_user_id: string;
  worker_id: string | null;
  request_type: LeaveRequestType;
  requested_start_date: string;
  requested_end_date: string;
  status: LeaveRequestStatus;
  admin_counter_start_date: string | null;
  admin_counter_end_date: string | null;
  worker_comment: string | null;
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkerTimeStatus = 'running' | 'submitted' | 'approved' | 'rejected';

export interface WorkerTimeEntry {
  id: string;
  worker_user_id: string;
  worker_id: string | null;
  work_date: string;
  start_at: string;
  end_at: string | null;
  break_minutes: number;
  worked_minutes: number | null;
  status: WorkerTimeStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  super_admin_comment: string | null;
  created_at: string;
  updated_at: string;
}
