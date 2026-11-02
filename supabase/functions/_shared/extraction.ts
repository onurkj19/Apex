/**
 * Pure helpers for AI extraction of handwritten Tagesrapporte. No network, no Deno APIs:
 * unit-tested with Node. AI output is never trusted; every line is flagged and must be verified by a human.
 */

export interface RawExtractedLine {
  worker_name?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  break_minutes?: unknown;
  total_hours?: unknown;
  confidence?: unknown;
  notes?: unknown;
}

export interface RawExtraction {
  document_number?: unknown;
  report_date?: unknown;
  site?: unknown;
  external_company?: unknown;
  team_leader?: unknown;
  lines?: unknown;
}

export type LineFlag =
  | 'missing_time'
  | 'invalid_time'
  | 'total_mismatch'
  | 'low_confidence'
  | 'unmatched_worker'
  | 'ambiguous_worker'
  | 'implausible_hours'
  | 'missing_name';

export interface NormalizedLine {
  worker_name_raw: string | null;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  reported_total_minutes: number | null;
  confidence: number | null;
  notes: string | null;
  flags: LineFlag[];
  worker_id: string | null;
  worker_candidates: string[];
}

export interface NormalizedExtraction {
  document_number: string | null;
  report_date: string | null;
  site: string | null;
  external_company: string | null;
  team_leader: string | null;
  lines: NormalizedLine[];
}

export interface WorkerRef {
  id: string;
  full_name: string;
}

const LOW_CONFIDENCE = 0.8;
const MAX_PLAUSIBLE_MINUTES = 14 * 60;
const TOTAL_TOLERANCE_MINUTES = 6;

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.slice(0, 500);
};

export const normalizeClock = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2})[:.h](\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const clockToMinutes = (value: string): number => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim())) return Number(value.trim().replace(',', '.'));
  return null;
};

export const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ë/g, 'e')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const levenshtein = (a: string, b: string): number => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
};

const tokenSet = (name: string) => normalizeName(name).split(' ').filter(Boolean);

/** Exact normalized match wins; otherwise near matches are returned as candidates (never auto-assigned). */
export const matchWorker = (rawName: string, workers: WorkerRef[]): { workerId: string | null; candidates: string[] } => {
  const target = normalizeName(rawName);
  if (!target) return { workerId: null, candidates: [] };
  const exact = workers.filter((w) => normalizeName(w.full_name) === target);
  if (exact.length === 1) return { workerId: exact[0].id, candidates: [] };
  if (exact.length > 1) return { workerId: null, candidates: exact.map((w) => w.id) };

  const targetTokens = tokenSet(rawName);
  const near = workers.filter((w) => {
    const name = normalizeName(w.full_name);
    if (levenshtein(name, target) <= Math.max(1, Math.floor(target.length / 8))) return true;
    const tokens = tokenSet(w.full_name);
    return targetTokens.length >= 2 && targetTokens.every((t) => tokens.includes(t));
  });
  return { workerId: null, candidates: near.map((w) => w.id) };
};

export const normalizeExtraction = (raw: RawExtraction, workers: WorkerRef[]): NormalizedExtraction => {
  const rawLines = Array.isArray(raw.lines) ? (raw.lines as RawExtractedLine[]) : [];
  const date = typeof raw.report_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.report_date.trim()) ? raw.report_date.trim() : null;
  const lines = rawLines.slice(0, 100).map((line): NormalizedLine => {
    const flags: LineFlag[] = [];
    const name = text(line.worker_name);
    const start = normalizeClock(line.start_time);
    const end = normalizeClock(line.end_time);
    const startGiven = text(line.start_time) !== null;
    const endGiven = text(line.end_time) !== null;
    if ((startGiven && !start) || (endGiven && !end)) flags.push('invalid_time');
    if (!start || !end) {
      if (!startGiven || !endGiven) flags.push('missing_time');
    }
    const breakRaw = toNumber(line.break_minutes);
    const breakMinutes = breakRaw !== null && breakRaw >= 0 && breakRaw <= 480 ? Math.round(breakRaw) : 0;
    const hours = toNumber(line.total_hours);
    const reportedTotal = hours !== null && hours >= 0 && hours <= 24 ? Math.round(hours * 60) : null;

    if (start && end) {
      const computed = clockToMinutes(end) - clockToMinutes(start) - breakMinutes;
      if (computed <= 0) flags.push('invalid_time');
      else {
        if (computed > MAX_PLAUSIBLE_MINUTES) flags.push('implausible_hours');
        if (reportedTotal !== null && Math.abs(computed - reportedTotal) > TOTAL_TOLERANCE_MINUTES) flags.push('total_mismatch');
      }
    } else if (reportedTotal !== null && reportedTotal > MAX_PLAUSIBLE_MINUTES) {
      flags.push('implausible_hours');
    }

    const confRaw = toNumber(line.confidence);
    const confidence = confRaw !== null && confRaw >= 0 && confRaw <= 1 ? Math.round(confRaw * 100) / 100 : null;
    if (confidence === null || confidence < LOW_CONFIDENCE) flags.push('low_confidence');

    let workerId: string | null = null;
    let candidates: string[] = [];
    if (!name) flags.push('missing_name');
    else {
      const match = matchWorker(name, workers);
      workerId = match.workerId;
      candidates = match.candidates;
      if (!workerId) flags.push(candidates.length > 0 ? 'ambiguous_worker' : 'unmatched_worker');
    }
    return {
      worker_name_raw: name,
      start_time: start,
      end_time: end,
      break_minutes: breakMinutes,
      reported_total_minutes: reportedTotal,
      confidence,
      notes: text(line.notes),
      flags: [...new Set(flags)],
      worker_id: workerId,
      worker_candidates: candidates,
    };
  });
  return {
    document_number: text(raw.document_number),
    report_date: date,
    site: text(raw.site),
    external_company: text(raw.external_company),
    team_leader: text(raw.team_leader),
    lines,
  };
};

/** Extracts the first JSON object from a model answer, tolerating markdown fences. */
export const parseModelJson = (content: string): RawExtraction | null => {
  const cleaned = content.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as RawExtraction) : null;
  } catch {
    return null;
  }
};

export const EXTRACTION_PROMPT = [
  'You read photos of handwritten German construction "Tagesrapport" sheets (scaffolding company).',
  'Return ONLY a JSON object: {"document_number": string|null, "report_date": "YYYY-MM-DD"|null, "site": string|null,',
  '"external_company": string|null, "team_leader": string|null, "lines": [{"worker_name": string, "start_time": "HH:MM"|null,',
  '"end_time": "HH:MM"|null, "break_minutes": number|null, "total_hours": number|null, "confidence": number between 0 and 1, "notes": string|null}]}.',
  'One line per worker. Never guess unreadable values: use null and a low confidence. Do not invent workers or hours.',
].join(' ');
