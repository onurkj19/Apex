import supabase from '@/lib/supabase';
import type { DashboardStats } from '@/lib/erp-types';

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const { data, error } = await supabase.from('v_dashboard_stats').select('*').single();
    if (error) throw error;
    return data as DashboardStats;
  },

  async getProjectStatusDistribution() {
    const { data, error } = await supabase.from('projects').select('status').is('deleted_at', null);
    if (error) throw error;
    const counts = (data || []).reduce<Record<string, number>>((acc, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async getMonthlyFinance() {
    const { data, error } = await supabase
      .from('finances')
      .select('amount, finance_type, finance_date')
      .gte('finance_date', new Date(new Date().getFullYear(), 0, 1).toISOString());
    if (error) throw error;
    const monthly = new Map<string, { month: string; teArdhura: number; shpenzime: number }>();
    (data || []).forEach((row: any) => {
      const month = new Date(row.finance_date).toLocaleDateString('sq-AL', { month: 'short' });
      if (!monthly.has(month)) monthly.set(month, { month, teArdhura: 0, shpenzime: 0 });
      const item = monthly.get(month)!;
      if (row.finance_type === 'income') item.teArdhura += Number(row.amount || 0);
      else item.shpenzime += Number(row.amount || 0);
    });
    return Array.from(monthly.values());
  },
  async getTrendAlarms() {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [{ data: financeRows, error: financeError }, { data: projectRows, error: projectError }] = await Promise.all([
      supabase
        .from('finances')
        .select('amount, finance_type, finance_date')
        .gte('finance_date', previousStart.toISOString().slice(0, 10)),
      supabase.from('projects').select('status, progress').is('deleted_at', null),
    ]);

    if (financeError) throw financeError;
    if (projectError) throw projectError;

    const rows = financeRows || [];
    const sumRange = (from: Date, to: Date, type: 'income' | 'expense') =>
      rows
        .filter((x: any) => {
          const d = new Date(x.finance_date);
          return x.finance_type === type && d >= from && d <= to;
        })
        .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);

    const currentIncome = sumRange(currentStart, now, 'income');
    const currentExpense = sumRange(currentStart, now, 'expense');
    const prevIncome = sumRange(previousStart, previousEnd, 'income');
    const prevExpense = sumRange(previousStart, previousEnd, 'expense');

    const currentMargin = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;
    const prevMargin = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : 0;
    const marginDrop = prevMargin - currentMargin;
    const expenseSpikePct = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0;

    const activeProjects = (projectRows || []).filter((p: any) => p.status === 'Ne pune').length;
    const stalledProjects = (projectRows || []).filter((p: any) => p.status === 'Ne pune' && Number(p.progress || 0) < 20).length;

    const alarms: Array<{ type: string; severity: 'low' | 'medium' | 'high'; message: string; value: number }> = [];
    if (marginDrop > 8) alarms.push({ type: 'margin_drop', severity: 'high', message: 'Profit margin ka renie te ndjeshme', value: marginDrop });
    if (expenseSpikePct > 20) alarms.push({ type: 'expense_spike', severity: 'high', message: 'Shpenzimet mujore jane rritur ndjeshem', value: expenseSpikePct });
    if (stalledProjects >= 3) alarms.push({ type: 'project_stall', severity: 'medium', message: 'Ka disa projekte aktive me progres te ulet', value: stalledProjects });

    return {
      metrics: {
        currentMargin,
        prevMargin,
        marginDrop,
        currentExpense,
        prevExpense,
        expenseSpikePct,
        activeProjects,
        stalledProjects,
      },
      alarms,
    };
  },
};
