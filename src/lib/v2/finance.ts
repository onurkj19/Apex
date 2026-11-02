import {
  type Decimal,
  ZERO,
  add,
  allocateByWeights,
  amountFromMinutes,
  div,
  mul,
  parseDecimal,
  roundTo,
  sub,
} from './decimal';
import { isoWeekKey, monthKey, yearKey } from './time';

export interface FinanceEntry {
  id: string;
  work_date: string;
  status: string;
  worker_id: string;
  worker: string | null;
  assignment_id: string | null;
  assignment_number: string | null;
  client_id: string | null;
  client: string | null;
  project_id: string | null;
  project: string | null;
  worked_minutes: number;
  approved_minutes: number | null;
  billable_minutes: number | null;
  billing_rate: string | null;
  projected_rate: string | null;
  is_saturday: boolean;
  saturday_amount: string | null;
  saturday_rate: string | null;
  saturday_minutes: number | null;
  saturday_status: string | null;
}

export interface FinanceSalaryConfig {
  worker_id: string;
  monthly_gross_salary: string | null;
  employer_cost_percent: string | null;
  employer_cost_applies_to_saturday: boolean;
  reference_hours: string | null;
  is_active: boolean;
}

export interface FinanceMonthlySalary {
  worker_id: string;
  month: string;
  gross_salary: string;
}

export interface FinanceExpense {
  id: string;
  assignment_id: string;
  worker_id: string | null;
  date: string;
  category: string | null;
  amount: string;
  description: string | null;
  client_id: string | null;
  client: string | null;
  assignment_number: string | null;
}

export interface FinanceInputs {
  entries: FinanceEntry[];
  salaries: FinanceSalaryConfig[];
  monthly_salaries: FinanceMonthlySalary[];
  expenses: FinanceExpense[];
}

export type EntryKind = 'unterakkord' | 'apex';

export interface EntryResult {
  entryId: string;
  date: string;
  workerId: string;
  worker: string;
  kind: EntryKind;
  assignmentId: string | null;
  assignmentNumber: string | null;
  clientId: string | null;
  client: string | null;
  projectId: string | null;
  project: string | null;
  status: string;
  isSaturday: boolean;
  /** Minutes used as the labor-cost basis (approved minutes, else worked minutes). */
  workedMinutes: number;
  /** Minutes billed to the client (Unterakkord only). */
  billableMinutes: number;
  billingRate: Decimal | null;
  rateIsProjected: boolean;
  revenue: Decimal;
  /** Salary share allocated to this entry (weekday work). */
  salaryCost: Decimal;
  /** Directly attributable Saturday payment cost. */
  saturdayCost: Decimal;
  laborCost: Decimal;
}

export interface Flag {
  code: 'missing_salary' | 'missing_billing_rate' | 'unallocated_salary' | 'saturday_without_payment';
  workerId?: string;
  month?: string;
  entryId?: string;
  message: string;
}

export interface FinanceResult {
  entries: EntryResult[];
  expenses: { expense: FinanceExpense; amount: Decimal }[];
  /** Salary cost for worker-months that had no weekday minutes to allocate onto. */
  unallocatedSalary: Decimal;
  totalSalaryCostConfigured: Decimal;
  flags: Flag[];
}

export interface FinanceOptions {
  includeStatuses?: string[];
  employerCostDefaultPercent?: string;
}

const entryMinutes = (e: FinanceEntry): number => e.approved_minutes ?? e.worked_minutes;

/**
 * Pure allocation engine. Each worker's fixed monthly salary is allocated exactly once across the
 * weekday minutes of that month (all Apex projects and Unterakkord assignments together), so costs are
 * never counted twice. Saturday work is costed directly from its Saturday payment record.
 */
export const computeFinance = (inputs: FinanceInputs, options: FinanceOptions = {}): FinanceResult => {
  const statuses = new Set(options.includeStatuses ?? ['approved']);
  const flags: Flag[] = [];
  const entries = inputs.entries.filter((e) => statuses.has(e.status));
  const configByWorker = new Map(inputs.salaries.filter((s) => s.is_active).map((s) => [s.worker_id, s]));
  const monthlyOverride = new Map(inputs.monthly_salaries.map((m) => [`${m.worker_id}|${m.month.slice(0, 7)}`, m]));
  const defaultEmployerPercent = parseDecimal(options.employerCostDefaultPercent ?? '0');

  const results: EntryResult[] = entries.map((e) => {
    const isUnterakkord = e.assignment_id !== null;
    const minutes = entryMinutes(e);
    const billable = isUnterakkord ? (e.billable_minutes ?? minutes) : 0;
    let rate: Decimal | null = null;
    let projected = false;
    if (isUnterakkord) {
      if (e.billing_rate !== null) rate = parseDecimal(e.billing_rate);
      else if (e.projected_rate !== null) {
        rate = parseDecimal(e.projected_rate);
        projected = true;
      } else {
        flags.push({ code: 'missing_billing_rate', entryId: e.id, message: 'Kein Verrechnungssatz verfügbar.' });
      }
    }
    return {
      entryId: e.id,
      date: e.work_date,
      workerId: e.worker_id,
      worker: e.worker ?? e.worker_id,
      kind: isUnterakkord ? 'unterakkord' : 'apex',
      assignmentId: e.assignment_id,
      assignmentNumber: e.assignment_number,
      clientId: e.client_id,
      client: e.client,
      projectId: e.project_id,
      project: e.project,
      status: e.status,
      isSaturday: e.is_saturday,
      workedMinutes: minutes,
      billableMinutes: billable,
      billingRate: rate,
      rateIsProjected: projected,
      revenue: rate !== null ? amountFromMinutes(billable, rate) : ZERO,
      salaryCost: ZERO,
      saturdayCost: ZERO,
      laborCost: ZERO,
    };
  });

  const groups = new Map<string, number[]>();
  results.forEach((r, index) => {
    const key = `${r.workerId}|${monthKey(r.date)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(index);
  });

  let unallocated = ZERO;
  let totalConfigured = ZERO;

  groups.forEach((indexes, key) => {
    const [workerId, month] = key.split('|');
    const config = configByWorker.get(workerId);
    const override = monthlyOverride.get(key);
    const employerPercent = config?.employer_cost_percent ? parseDecimal(config.employer_cost_percent) : defaultEmployerPercent;
    const factor = add(parseDecimal('1'), div(employerPercent, parseDecimal('100')));
    const grossStr = override?.gross_salary ?? config?.monthly_gross_salary ?? null;

    const weekday = indexes.filter((i) => !results[i].isSaturday);
    if (grossStr === null) {
      flags.push({ code: 'missing_salary', workerId, month, message: 'Kein Monatslohn erfasst; Lohnkosten nicht berechenbar.' });
    } else {
      const salaryCost = roundTo(mul(parseDecimal(grossStr), factor), 2);
      totalConfigured = add(totalConfigured, salaryCost);
      if (weekday.length === 0) {
        unallocated = add(unallocated, salaryCost);
        flags.push({ code: 'unallocated_salary', workerId, month, message: 'Monatslohn ohne Werktagsstunden; nicht zugeordnet.' });
      } else {
        const parts = allocateByWeights(salaryCost, weekday.map((i) => results[i].workedMinutes));
        weekday.forEach((i, n) => {
          results[i].salaryCost = parts[n];
        });
      }
    }

    const saturdayFactor = config?.employer_cost_applies_to_saturday ? factor : parseDecimal('1');
    indexes
      .filter((i) => results[i].isSaturday)
      .forEach((i) => {
        const source = entries.find((e) => e.id === results[i].entryId)!;
        if (source.saturday_amount === null) {
          flags.push({ code: 'saturday_without_payment', entryId: source.id, message: 'Samstagseintrag ohne Zahlungsdatensatz.' });
          return;
        }
        results[i].saturdayCost = roundTo(mul(parseDecimal(source.saturday_amount), saturdayFactor), 2);
      });
  });

  results.forEach((r) => {
    r.laborCost = add(r.salaryCost, r.saturdayCost);
  });

  const expenses = inputs.expenses.map((expense) => ({ expense, amount: parseDecimal(expense.amount) }));
  return { entries: results, expenses, unallocatedSalary: unallocated, totalSalaryCostConfigured: totalConfigured, flags };
};

export type GroupBy = 'employee' | 'client' | 'assignment' | 'week' | 'month' | 'year';

export interface Summary {
  key: string;
  label: string;
  workedMinutes: number;
  billableMinutes: number;
  saturdayMinutes: number;
  revenue: Decimal;
  laborCost: Decimal;
  saturdayCost: Decimal;
  expenses: Decimal;
  margin: Decimal;
  /** margin / revenue in percent (2 dp), null when revenue is zero. */
  marginPercent: Decimal | null;
  revenuePerHour: Decimal | null;
  costPerHour: Decimal | null;
}

const emptySummary = (key: string, label: string): Summary => ({
  key,
  label,
  workedMinutes: 0,
  billableMinutes: 0,
  saturdayMinutes: 0,
  revenue: ZERO,
  laborCost: ZERO,
  saturdayCost: ZERO,
  expenses: ZERO,
  margin: ZERO,
  marginPercent: null,
  revenuePerHour: null,
  costPerHour: null,
});

const finalize = (s: Summary): Summary => {
  s.margin = sub(sub(s.revenue, s.laborCost), s.expenses);
  s.marginPercent = s.revenue === ZERO ? null : roundTo(div(mul(s.margin, parseDecimal('100')), s.revenue), 2);
  s.revenuePerHour = s.billableMinutes > 0 ? roundTo(div(mul(s.revenue, parseDecimal('60')), parseDecimal(s.billableMinutes)), 2) : null;
  s.costPerHour = s.workedMinutes > 0 ? roundTo(div(mul(s.laborCost, parseDecimal('60')), parseDecimal(s.workedMinutes)), 2) : null;
  return s;
};

/** Only Unterakkord entries are included; Apex project work is reported separately. */
export const summarizeUnterakkord = (result: FinanceResult, by: GroupBy): Summary[] => {
  const map = new Map<string, Summary>();
  const get = (key: string, label: string) => {
    if (!map.has(key)) map.set(key, emptySummary(key, label));
    return map.get(key)!;
  };
  const keyFor = (r: { workerId?: string; worker?: string; clientId?: string | null; client?: string | null; assignmentId?: string | null; assignmentNumber?: string | null; date?: string }): [string, string] => {
    switch (by) {
      case 'employee':
        return [r.workerId ?? '', r.worker ?? ''];
      case 'client':
        return [r.clientId ?? 'none', r.client ?? 'Ohne Kunde'];
      case 'assignment':
        return [r.assignmentId ?? 'none', r.assignmentNumber ?? 'Ohne Auftrag'];
      case 'week':
        return [isoWeekKey(r.date!), isoWeekKey(r.date!)];
      case 'month':
        return [monthKey(r.date!), monthKey(r.date!)];
      case 'year':
        return [yearKey(r.date!), yearKey(r.date!)];
    }
  };
  result.entries
    .filter((r) => r.kind === 'unterakkord')
    .forEach((r) => {
      const [key, label] = keyFor(r);
      const s = get(key, label);
      s.workedMinutes += r.workedMinutes;
      s.billableMinutes += r.billableMinutes;
      if (r.isSaturday) s.saturdayMinutes += r.workedMinutes;
      s.revenue = add(s.revenue, r.revenue);
      s.laborCost = add(s.laborCost, r.laborCost);
      s.saturdayCost = add(s.saturdayCost, r.saturdayCost);
    });
  result.expenses.forEach(({ expense, amount }) => {
    const [key, label] = keyFor({
      workerId: expense.worker_id ?? undefined,
      worker: expense.worker_id ?? undefined,
      clientId: expense.client_id,
      client: expense.client,
      assignmentId: expense.assignment_id,
      assignmentNumber: expense.assignment_number,
      date: expense.date,
    });
    if (by === 'employee' && !expense.worker_id) return;
    const s = get(key, label);
    s.expenses = add(s.expenses, amount);
  });
  return [...map.values()].map(finalize).sort((a, b) => a.label.localeCompare(b.label, 'de'));
};

export const totalOf = (summaries: Summary[], label = 'Total'): Summary => {
  const t = emptySummary('total', label);
  summaries.forEach((s) => {
    t.workedMinutes += s.workedMinutes;
    t.billableMinutes += s.billableMinutes;
    t.saturdayMinutes += s.saturdayMinutes;
    t.revenue = add(t.revenue, s.revenue);
    t.laborCost = add(t.laborCost, s.laborCost);
    t.saturdayCost = add(t.saturdayCost, s.saturdayCost);
    t.expenses = add(t.expenses, s.expenses);
  });
  return finalize(t);
};

/** Apex-own project labor cost (allocated salary share + Saturday cost), grouped by project. */
export const summarizeApexProjects = (result: FinanceResult): Summary[] => {
  const map = new Map<string, Summary>();
  result.entries
    .filter((r) => r.kind === 'apex' && r.projectId)
    .forEach((r) => {
      const key = r.projectId!;
      if (!map.has(key)) map.set(key, emptySummary(key, r.project ?? key));
      const s = map.get(key)!;
      s.workedMinutes += r.workedMinutes;
      if (r.isSaturday) s.saturdayMinutes += r.workedMinutes;
      s.laborCost = add(s.laborCost, r.laborCost);
      s.saturdayCost = add(s.saturdayCost, r.saturdayCost);
    });
  return [...map.values()].map(finalize).sort((a, b) => a.label.localeCompare(b.label, 'de'));
};

export const totalAllocatedLabor = (result: FinanceResult): Decimal =>
  result.entries.reduce((acc, r) => add(acc, r.laborCost), ZERO);
