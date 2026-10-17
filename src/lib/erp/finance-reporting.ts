import supabase from '@/lib/supabase';
import { zurichDate, type ReceiptRow } from '@/lib/payment-summary';
export interface ReportingRow extends ReceiptRow { id: string; finance_date: string; }
/** PostgREST defaults to bounded pages; paginate to avoid silently dropping older receipts. */
export async function loadFinanceReportingRows(): Promise<ReportingRow[]> {
  const result: ReportingRow[] = [];
  for (let from=0;;) {
    const { data, error } = await supabase.from('finances')
      .select('id, project_id, amount, finance_type, finance_date, payment_reconciliation(status)')
      .lte('finance_date',zurichDate()).order('id').range(from,from+999);
    if (error) throw error;
    const page = (data || []) as ReportingRow[];
    result.push(...page);
    if (page.length === 0) return result;
    from += page.length;
  }
}
