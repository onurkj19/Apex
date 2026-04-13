/** MwSt e zakonshme në CH (p.sh. shërbime / ndërtim) — përdoret për ndarjen neto nga brutto. */
export const CH_MWST_RATE = 0.081;
export const CH_GROSS_DIVISOR = 1 + CH_MWST_RATE; // 1.081

/** Nga çmimi brutto (inkl. MwSt) në neto (pa tatim). */
export function netRevenueFromGrossInclMwst(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return gross / CH_GROSS_DIVISOR;
}
