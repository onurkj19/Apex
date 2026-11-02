/**
 * Exact decimal arithmetic for authoritative monetary calculations.
 * Values are fixed-point bigints with 6 fractional digits. No JavaScript float math is used.
 */
export type Decimal = bigint;

const SCALE_DIGITS = 6;
const SCALE = 10n ** BigInt(SCALE_DIGITS);

export const ZERO: Decimal = 0n;

export const parseDecimal = (input: string | number | bigint | null | undefined): Decimal => {
  if (input === null || input === undefined || input === '') return ZERO;
  if (typeof input === 'bigint') return input * SCALE;
  const text = String(input).trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`Ungültiger Dezimalwert: ${text}`);
  }
  const negative = text.startsWith('-');
  const unsigned = text.replace(/^[+-]/, '');
  const [whole, frac = ''] = unsigned.split('.');
  const padded = (frac + '0'.repeat(SCALE_DIGITS)).slice(0, SCALE_DIGITS);
  const rest = frac.slice(SCALE_DIGITS);
  let value = BigInt(whole) * SCALE + BigInt(padded || '0');
  if (rest.length > 0 && rest.charCodeAt(0) >= 53) value += 1n;
  return negative ? -value : value;
};

const divRoundHalfAwayFromZero = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator === 0n) throw new Error('Division durch null.');
  const negative = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (n * 2n + d) / (d * 2n);
  return negative ? -q : q;
};

export const add = (a: Decimal, b: Decimal): Decimal => a + b;
export const sub = (a: Decimal, b: Decimal): Decimal => a - b;
export const mul = (a: Decimal, b: Decimal): Decimal => divRoundHalfAwayFromZero(a * b, SCALE);
export const div = (a: Decimal, b: Decimal): Decimal => divRoundHalfAwayFromZero(a * SCALE, b);

export const roundTo = (value: Decimal, digits = 2): Decimal => {
  if (digits >= SCALE_DIGITS) return value;
  const unit = 10n ** BigInt(SCALE_DIGITS - digits);
  return divRoundHalfAwayFromZero(value, unit) * unit;
};

export const sum = (values: Decimal[]): Decimal => values.reduce((acc, v) => acc + v, ZERO);

export const formatDecimal = (value: Decimal, digits = 2): string => {
  const rounded = roundTo(value, digits);
  const negative = rounded < 0n;
  const abs = negative ? -rounded : rounded;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(SCALE_DIGITS, '0').slice(0, digits);
  const body = digits > 0 ? `${whole}.${frac}` : `${whole}`;
  return negative && /[1-9]/.test(body) ? `-${body}` : body;
};

/** Swiss-style display, e.g. 1'234.50 */
export const formatChf = (value: Decimal, digits = 2): string => {
  const plain = formatDecimal(value, digits);
  const negative = plain.startsWith('-');
  const [whole, frac] = plain.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${negative ? '-' : ''}${grouped}${frac !== undefined ? `.${frac}` : ''}`;
};

export const compare = (a: Decimal, b: Decimal): number => (a < b ? -1 : a > b ? 1 : 0);

/** Exact: minutes * hourlyRate / 60, rounded half away from zero to cents. */
export const amountFromMinutes = (minutes: number, hourlyRate: Decimal): Decimal => {
  if (!Number.isInteger(minutes)) throw new Error('Minuten müssen ganzzahlig sein.');
  return roundTo(divRoundHalfAwayFromZero(BigInt(minutes) * hourlyRate, 60n), 2);
};

/** minutes/60 as a decimal string with two digits (e.g. 360 -> "6.00"). */
export const hoursFromMinutes = (minutes: number, digits = 2): string =>
  formatDecimal(divRoundHalfAwayFromZero(BigInt(minutes) * SCALE, 60n), digits);

/**
 * Splits `total` (rounded to cents) proportionally to non-negative integer weights.
 * Largest-remainder method: the parts always sum exactly to the rounded total.
 */
export const allocateByWeights = (total: Decimal, weights: number[]): Decimal[] => {
  const cents = roundTo(total, 2) / 10_000n;
  const weightSum = weights.reduce((acc, w) => acc + BigInt(w), 0n);
  if (weights.length === 0) return [];
  if (weightSum === 0n) return weights.map(() => ZERO);
  const base: bigint[] = [];
  const remainders: { index: number; rem: bigint }[] = [];
  let assigned = 0n;
  weights.forEach((w, index) => {
    const num = cents * BigInt(w);
    const q = num / weightSum;
    base.push(q);
    assigned += q;
    remainders.push({ index, rem: num - q * weightSum });
  });
  let left = cents - assigned;
  const step = left < 0n ? -1n : 1n;
  remainders.sort((a, b) => (a.rem === b.rem ? a.index - b.index : a.rem > b.rem ? -1 : 1));
  for (let i = 0; left !== 0n; i = (i + 1) % remainders.length) {
    base[remainders[i].index] += step;
    left -= step;
  }
  return base.map((c) => c * 10_000n);
};
