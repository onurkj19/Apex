import supabase from '@/lib/supabase';
import type { WorkLog } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export const workLogApi = {
  async list(): Promise<WorkLog[]> {
    const { data, error } = await supabase.from('work_logs').select('*').order('work_date', { ascending: false });
    if (error) throw error;
    return (data || []) as WorkLog[];
  },
  async create(payload: Partial<WorkLog>) {
    const { error } = await supabase.from('work_logs').insert(payload);
    if (error) throw error;
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
