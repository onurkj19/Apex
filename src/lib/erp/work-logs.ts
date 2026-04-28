import supabase from '@/lib/supabase';
import type { WorkLog } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

/** Krijon automatikisht shpenzime në Financat për çdo rresht ore pune të shtuar. */
async function createExpensesForWorkLogs(payloads: Partial<WorkLog>[]): Promise<void> {
  if (payloads.length === 0) return;

  // Merr emrat e punëtorëve për tituj më të qartë
  const workerIds = [...new Set(payloads.map((p) => p.worker_id).filter(Boolean))] as string[];
  const { data: workers } = await supabase
    .from('workers')
    .select('id, full_name')
    .in('id', workerIds);
  const workerNameMap = new Map<string, string>(
    (workers || []).map((w: { id: string; full_name: string }) => [w.id, w.full_name]),
  );

  const today = new Date().toISOString().slice(0, 10);
  const expenses = payloads.map((row) => {
    const hours = Number(row.hours_worked || 0);
    const rate = Number(row.hourly_rate || 0);
    const amount = Math.round(hours * rate * 100) / 100;
    const workerName = row.worker_id ? (workerNameMap.get(row.worker_id) || 'Punëtor') : 'Punëtor';
    return {
      title: `Pagë pune — ${workerName} (${hours}h × ${rate} CHF/h)`,
      amount,
      finance_type: 'expense' as const,
      category: 'Mjete Pune' as const,
      payment_method: 'Cash' as const,
      finance_date: row.work_date || today,
      project_id: row.project_id || null,
    };
  });

  // Filtro rreshtat me shumë 0 (nëse tarifat nuk janë caktuar)
  const validExpenses = expenses.filter((e) => e.amount > 0);
  if (validExpenses.length === 0) return;

  const { error } = await supabase.from('finances').insert(validExpenses);
  if (error) throw error;
}

/**
 * Gjen të gjitha work_logs që nuk kanë ende shpenzim të lidhur
 * (bazuar në titullin e shpenzimit) dhe krijon shpenzime për to.
 * Kthehet numri i shpenzimeve të reja të krijuara.
 */
export async function syncWorkLogExpenses(): Promise<number> {
  // Merr të gjitha work_logs
  const { data: allLogs, error: logsErr } = await supabase
    .from('work_logs')
    .select('*')
    .order('work_date', { ascending: false });
  if (logsErr) throw logsErr;
  const logs = (allLogs || []) as WorkLog[];
  if (logs.length === 0) return 0;

  // Merr të gjitha shpenzimet ekzistuese me titull "Pagë pune"
  const { data: existingExpenses, error: finErr } = await supabase
    .from('finances')
    .select('title, finance_date, project_id, amount')
    .eq('finance_type', 'expense')
    .like('title', 'Pagë pune —%');
  if (finErr) throw finErr;

  // Nderto një Set me çelësa unikë të shpenzimeve ekzistuese
  const existingKeys = new Set(
    (existingExpenses || []).map((e: any) =>
      `${e.title}|${e.finance_date}|${e.project_id ?? ''}|${e.amount}`
    )
  );

  // Merr emrat e punëtorëve
  const workerIds = [...new Set(logs.map((l) => l.worker_id).filter(Boolean))];
  const { data: workers } = await supabase.from('workers').select('id, full_name').in('id', workerIds);
  const workerNameMap = new Map<string, string>(
    (workers || []).map((w: { id: string; full_name: string }) => [w.id, w.full_name])
  );

  // Filtro vetëm ato log që nuk kanë shpenzim
  const today = new Date().toISOString().slice(0, 10);
  const newExpenses: object[] = [];
  for (const row of logs) {
    const hours = Number(row.hours_worked || 0);
    const rate = Number(row.hourly_rate || 0);
    const amount = Math.round(hours * rate * 100) / 100;
    if (amount <= 0) continue;
    const workerName = row.worker_id ? (workerNameMap.get(row.worker_id) || 'Punëtor') : 'Punëtor';
    const title = `Pagë pune — ${workerName} (${hours}h × ${rate} CHF/h)`;
    const finance_date = row.work_date || today;
    const project_id = row.project_id || null;
    const key = `${title}|${finance_date}|${project_id ?? ''}|${amount}`;
    if (!existingKeys.has(key)) {
      newExpenses.push({ title, amount, finance_type: 'expense', category: 'Mjete Pune', payment_method: 'Cash', finance_date, project_id });
      existingKeys.add(key); // shmang duplikatat brenda të njëjtit sync
    }
  }

  if (newExpenses.length === 0) return 0;
  const { error: insErr } = await supabase.from('finances').insert(newExpenses);
  if (insErr) throw insErr;
  return newExpenses.length;
}

export const workLogApi = {
  async list(): Promise<WorkLog[]> {
    const { data, error } = await supabase.from('work_logs').select('*').order('work_date', { ascending: false });
    if (error) throw error;
    return (data || []) as WorkLog[];
  },
  async create(payload: Partial<WorkLog>) {
    const { error } = await supabase.from('work_logs').insert(payload);
    if (error) throw error;
    await createExpensesForWorkLogs([payload]);
    await createAdminChangeNotification(
      'Ore pune u regjistruan',
      `U regjistrua evidence pune per projektin ${payload.project_id || '-'}`,
      { work_log: payload }
    );
  },
  async createMany(payloads: Partial<WorkLog>[]) {
    if (payloads.length === 0) return;
    const { error } = await supabase.from('work_logs').insert(payloads);
    if (error) throw error;
    await createExpensesForWorkLogs(payloads);
    const totalHours = payloads.reduce((sum, row) => sum + Number(row.hours_worked || 0), 0);
    await createAdminChangeNotification(
      'Ore pune u regjistruan',
      `U ruajten ${payloads.length} evidenca pune (${totalHours.toFixed(2)} ore totale)`,
      { count: payloads.length, total_hours: totalHours, project_id: payloads[0]?.project_id || null }
    );
  },
  async getPayrollByMonth() {
    const { data, error } = await supabase
      .from('work_logs')
      .select('worker_id, hours_worked, total_amount, workers(full_name), work_date')
      .gte('work_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    if (error) throw error;

    const map = new Map<string, { worker_id: string; worker_name: string; total_hours: number; total_salary: number }>();
    (data || []).forEach((row: any) => {
      const key = row.worker_id;
      if (!map.has(key)) {
        map.set(key, {
          worker_id: row.worker_id,
          worker_name: row.workers?.full_name || 'Pa emer',
          total_hours: 0,
          total_salary: 0,
        });
      }
      const item = map.get(key)!;
      item.total_hours += Number(row.hours_worked || 0);
      item.total_salary += Number(row.total_amount || 0);
    });
    return Array.from(map.values());
  },
};
