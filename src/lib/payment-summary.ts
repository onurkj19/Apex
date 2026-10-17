export interface ReceiptRow {
  amount: number | string;
  finance_type: string;
  finance_date?: string;
  project_id?: string | null;
  payment_reconciliation?: { status: string; reference?: string | null } | Array<{status: string}> | null;
}
const cents = (value: number | string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Invalid financial amount');
  return Math.round((n + Number.EPSILON) * 100);
};
export function receiptReviewStatus(row: ReceiptRow): string | undefined {
  const review=row.payment_reconciliation;
  return Array.isArray(review) ? (review.length > 1 ? 'unverified' : review[0]?.status) : review?.status;
}
export const isConfirmedReceipt = (row: ReceiptRow) => row.finance_type === 'income' && (!receiptReviewStatus(row) || receiptReviewStatus(row) === 'confirmed');
export const zurichDate = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
/** Ledger totals and entered/evidence-backed receipts are distinct quantities. */
export function paymentSummary(rows: readonly ReceiptRow[]) {
  let recorded = 0, confirmed = 0, unverified = 0, notReceived = 0;
  for (const row of rows) {
    if (row.finance_type !== 'income') continue;
    const amount = cents(row.amount); recorded += amount;
    const status = receiptReviewStatus(row);
    if (status === 'unverified') unverified += amount;
    else if (status === 'not_received') notReceived += amount;
    else if (!status || status === 'confirmed') confirmed += amount;
    else unverified += amount; // unknown review states fail closed
  }
  return { recorded: recorded/100, confirmed: confirmed/100, unverified: unverified/100, notReceived: notReceived/100 };
}
export function monthWindow(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, m] = month.split('-').map(Number);
  const end = `${m === 12 ? year+1 : year}-${String(m === 12 ? 1 : m+1).padStart(2,'0')}-01`;
  return { start: `${month}-01`, end };
}
export function comparablePeriods(today: string) {
  const [year, month, day] = today.split('-').map(Number);
  const py = month === 1 ? year-1 : year, pm = month === 1 ? 12 : month-1;
  const previousMonth = `${py}-${String(pm).padStart(2,'0')}`;
  const previousDay = Math.min(day,new Date(Date.UTC(py,pm,0)).getUTCDate());
  return { currentStart: `${today.slice(0,7)}-01`, currentEnd: today, previousStart: `${previousMonth}-01`, previousEnd: `${previousMonth}-${String(previousDay).padStart(2,'0')}` };
}
export function periodSummary(rows: readonly ReceiptRow[], from: string, through: string) {
  const selected = rows.filter(row => !!row.finance_date && row.finance_date >= from && row.finance_date <= through);
  const income = paymentSummary(selected);
  const expenses = selected.filter(row => row.finance_type === 'expense').reduce((sum,row)=>sum+cents(row.amount),0)/100;
  return { ...income, expenses, cashFlow: Math.round((income.confirmed-expenses)*100)/100 };
}
export function receivedByProject(rows: readonly ReceiptRow[]) {
  const result: Record<string, number> = {};
  for (const row of rows) if (row.project_id && isConfirmedReceipt(row)) result[row.project_id]=(result[row.project_id]||0)+cents(row.amount);
  for (const id of Object.keys(result)) result[id]/=100;
  return result;
}
