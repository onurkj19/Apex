import supabase from '@/lib/supabase';
import { loadFinanceReportingRows, type ReportingRow } from './finance-reporting';
import { comparablePeriods, periodSummary, receivedByProject, zurichDate } from '@/lib/payment-summary';
import type { DashboardStats } from '@/lib/erp-types';

/** Contract balance after confirmed/manually entered receipts, including completed jobs. */
export const dashboardApi = {
  getFinanceReportingRows: loadFinanceReportingRows,
  async getOutstandingReceivablesChf(rows?: ReportingRow[]): Promise<number> {
    const [financeRows, response] = await Promise.all([
      rows ? Promise.resolve(rows) : loadFinanceReportingRows(),
      supabase.from('projects').select('id, revenue').is('deleted_at',null).in('status',['I pranuar','Ne pune','I perfunduar']),
    ]);
    if (response.error) throw response.error;
    const received = receivedByProject(financeRows);
    return (response.data || []).reduce((sum,p)=>sum+Math.max(0,Math.round((Number(p.revenue)-(received[p.id]||0))*100)/100),0);
  },
  async getStats(rows?: ReportingRow[]): Promise<DashboardStats> {
    const [financeRows,response] = await Promise.all([
      rows ? Promise.resolve(rows) : loadFinanceReportingRows(),
      supabase.from('v_dashboard_stats').select('total_projects, active_projects, completed_projects').single(),
    ]);
    if (response.error) throw response.error;
    const today = zurichDate();
    const monthly = periodSummary(financeRows,`${today.slice(0,7)}-01`,today);
    const all = periodSummary(financeRows,'0000-01-01',today);
    return { ...response.data, monthly_revenue: monthly.confirmed, monthly_expenses: monthly.expenses, company_balance: all.cashFlow, unverified_receipts: all.unverified } as DashboardStats;
  },

  async getProjectStatusDistribution() {
    const { data, error } = await supabase.from('projects').select('status').is('deleted_at', null);
    if (error) throw error;
    const counts = (data || []).reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async getMonthlyFinance(rows?: ReportingRow[]) {
    const allRows = rows || await loadFinanceReportingRows();
    const year = zurichDate().slice(0,4);
    const monthly: Array<{month: string; teArdhura: number; shpenzime: number; perVerifikim: number}> = [];
    for (let m=1;m<=Number(zurichDate().slice(5,7));m++) {
      const key = `${year}-${String(m).padStart(2,'0')}`;
      const summary = periodSummary(allRows,`${key}-01`,`${key}-31`);
      monthly.push({ month: new Date(`${key}-15T12:00:00Z`).toLocaleDateString('sq-AL',{month:'short',timeZone:'Europe/Zurich'}), teArdhura: summary.confirmed, shpenzime: summary.expenses, perVerifikim: summary.unverified });
    }
    return monthly;
  },
  async getTrendAlarms(rows?: ReportingRow[]) {
    const dates = comparablePeriods(zurichDate());
    const [financeRows, {data: projectRows, error: projectError}] = await Promise.all([
      rows ? Promise.resolve(rows) : loadFinanceReportingRows(),
      supabase.from('projects').select('status, progress').is('deleted_at',null),
    ]);
    if (projectError) throw projectError;
    const current = periodSummary(financeRows,dates.currentStart,dates.currentEnd);
    const previous = periodSummary(financeRows,dates.previousStart,dates.previousEnd);
    const currentIncome=current.confirmed, prevIncome=previous.confirmed;
    const currentExpense=current.expenses, prevExpense=previous.expenses;
    const currentMargin=currentIncome>0?((currentIncome-currentExpense)/currentIncome)*100:0;
    const prevMargin=prevIncome>0?((prevIncome-prevExpense)/prevIncome)*100:0;
    const marginDrop=prevMargin-currentMargin;
    const expenseSpikePct=prevExpense>0?((currentExpense-prevExpense)/prevExpense)*100:0;
    const activeProjects = (projectRows || []).filter((p) => p.status === 'Ne pune').length;
    const stalledProjects = (projectRows || []).filter((p) => p.status === 'Ne pune' && Number(p.progress || 0) < 20).length;

    const alarms: Array<{ type: string; severity: 'low' | 'medium' | 'high'; message: string; value: number }> = [];
    if (marginDrop > 8) alarms.push({ type: 'margin_drop', severity: 'high', message: 'Fluksi neto ka rënie kundrejt së njëjtës periudhë të muajit të kaluar', value: marginDrop });
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
