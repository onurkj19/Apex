import type { FinanceEntry } from './erp-types';

/** Ledger totals and evidence-backed receipts are different quantities. Never infer receipt from job completion. */
export function paymentSummary(rows: FinanceEntry[]) {
  let recorded = 0, confirmed = 0, unverified = 0, notReceived = 0;
  for (const row of rows) {
    if (row.finance_type !== 'income') continue;
    const amount = Number(row.amount);
    recorded += amount;
    const status = row.payment_reconciliation?.status;
    if (status === 'unverified') unverified += amount;
    else if (status === 'not_received') notReceived += amount;
    else confirmed += amount; // ordinary manual receipts remain explicitly entered receipts
  }
  return { recorded, confirmed, unverified, notReceived };
}
