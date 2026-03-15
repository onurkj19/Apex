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
  worker_cost: number;
  extra_expense: number;
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
