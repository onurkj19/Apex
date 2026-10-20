export const REFERENCE_TZ = 'Europe/Zurich';

export const parseClock = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
};

export const formatClock = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export interface WorkSpan {
  start: string;
  end: string;
  breakMinutes: number;
}

export type SpanCheck = { ok: true; minutes: number } | { ok: false; error: string };

/** 07:00-14:00 with 60 min break => 360 minutes (6.00 h). */
export const calculateWorkedMinutes = ({ start, end, breakMinutes }: WorkSpan): SpanCheck => {
  const s = parseClock(start);
  const e = parseClock(end);
  if (s === null || e === null) return { ok: false, error: 'Ungültige Uhrzeit.' };
  if (e <= s) return { ok: false, error: 'Das Ende muss nach dem Beginn liegen.' };
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) return { ok: false, error: 'Ungültige Pause.' };
  const minutes = e - s - breakMinutes;
  if (minutes <= 0) return { ok: false, error: 'Die Pause ist länger als die Arbeitszeit.' };
  return { ok: true, minutes };
};

export interface SpanWithId extends WorkSpan {
  id?: string;
}

export const spansOverlap = (a: WorkSpan, b: WorkSpan): boolean => {
  const as = parseClock(a.start);
  const ae = parseClock(a.end);
  const bs = parseClock(b.start);
  const be = parseClock(b.end);
  if (as === null || ae === null || bs === null || be === null) return false;
  return as < be && bs < ae;
};

export const findOverlaps = (spans: SpanWithId[]): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < spans.length; i += 1) {
    for (let j = i + 1; j < spans.length; j += 1) {
      if (spansOverlap(spans[i], spans[j])) out.push([i, j]);
    }
  }
  return out;
};

const parseIsoDate = (iso: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Ungültiges Datum: ${iso}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

export const isSaturday = (iso: string): boolean => parseIsoDate(iso).getUTCDay() === 6;

export const todayInZurich = (now = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: REFERENCE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** ISO-8601 week key, e.g. 2026-W27 */
export const isoWeekKey = (iso: string): string => {
  const date = parseIsoDate(iso);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const monthKey = (iso: string): string => iso.slice(0, 7);
export const yearKey = (iso: string): string => iso.slice(0, 4);

export const mondayOf = (iso: string): string => {
  const date = parseIsoDate(iso);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
};

export const addDays = (iso: string, days: number): string => {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const formatDateDe = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
