// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const monthKey = new Date().toISOString().slice(0, 7);

    const [projectsRes, financeRes, workLogRes] = await Promise.all([
      supabase.from('projects').select('id, project_name, status'),
      supabase.from('finances').select('amount, finance_type, finance_date').gte('finance_date', `${monthKey}-01`),
      supabase.from('work_logs').select('hours_worked, total_amount, work_date').gte('work_date', `${monthKey}-01`),
    ]);

    if (projectsRes.error) throw projectsRes.error;
    if (financeRes.error) throw financeRes.error;
    if (workLogRes.error) throw workLogRes.error;

    const monthlyRevenue = (financeRes.data || [])
      .filter((x: any) => x.finance_type === 'income')
      .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

    const monthlyExpense = (financeRes.data || [])
      .filter((x: any) => x.finance_type === 'expense')
      .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

    const monthlyWorkerCost = (workLogRes.data || [])
      .reduce((sum: number, row: any) => sum + Number(row.total_amount || 0), 0);

    const reportData = {
      month_key: monthKey,
      project_summary: {
        total: (projectsRes.data || []).length,
        completed: (projectsRes.data || []).filter((p: any) => p.status === 'I perfunduar').length,
      },
      finance_summary: {
        revenue: monthlyRevenue,
        expenses: monthlyExpense,
        worker_cost: monthlyWorkerCost,
        profit_loss: monthlyRevenue - monthlyExpense - monthlyWorkerCost,
      },
      worker_hours_summary: {
        total_hours: (workLogRes.data || []).reduce((sum: number, row: any) => sum + Number(row.hours_worked || 0), 0),
      },
    };

    const { error: saveError } = await supabase
      .from('reports')
      .upsert(
        { month_key: monthKey, report_data: reportData, sent_at: new Date().toISOString() },
        { onConflict: 'month_key' },
      );

    if (saveError) throw saveError;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const reportTo = Deno.env.get('REPORT_RECIPIENT_EMAIL');

    if (resendApiKey && reportTo) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ERP Reports <reports@apex-geruste.ch>',
          to: [reportTo],
          subject: `Raporti mujor ERP - ${monthKey}`,
          html: `
            <h2>Raporti Mujor - ${monthKey}</h2>
            <p><strong>Projekte totale:</strong> ${reportData.project_summary.total}</p>
            <p><strong>Projekte te perfunduara:</strong> ${reportData.project_summary.completed}</p>
            <p><strong>Te ardhura:</strong> ${reportData.finance_summary.revenue.toFixed(2)} CHF</p>
            <p><strong>Shpenzime:</strong> ${reportData.finance_summary.expenses.toFixed(2)} CHF</p>
            <p><strong>Kosto punetoresh:</strong> ${reportData.finance_summary.worker_cost.toFixed(2)} CHF</p>
            <p><strong>Fitim/Humbje:</strong> ${reportData.finance_summary.profit_loss.toFixed(2)} CHF</p>
            <p><strong>Ore pune totale:</strong> ${reportData.worker_hours_summary.total_hours.toFixed(2)}</p>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, monthKey, reportData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
