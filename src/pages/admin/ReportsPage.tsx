import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi, projectApi, workLogApi } from '@/lib/erp-api';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';

const ReportsPage = () => {
  const [financeChart, setFinanceChart] = useState<any[]>([]);
  const [statusChart, setStatusChart] = useState<any[]>([]);
  const [profitLossChart, setProfitLossChart] = useState<any[]>([]);
  const [workerHoursChart, setWorkerHoursChart] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [finance, statuses, profitLoss, payroll] = await Promise.all([
        dashboardApi.getMonthlyFinance(),
        dashboardApi.getProjectStatusDistribution(),
        projectApi.getProfitLoss(),
        workLogApi.getPayrollByMonth(),
      ]);
      setFinanceChart(finance);
      setStatusChart(statuses);
      setProfitLossChart(
        profitLoss.map((p) => ({ name: p.project_name?.slice(0, 12) || 'Projekt', rezultat: Number(p.profit_loss || 0) })),
      );
      setWorkerHoursChart(
        payroll.map((p) => ({ name: p.worker_name?.slice(0, 12) || 'Punetor', ore: Number(p.total_hours || 0) })),
      );
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Raportet dhe analitika</h2>

      <Card>
        <CardHeader><CardTitle>Raporti financiar mujor</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={financeChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="teArdhura" stroke="#16a34a" fill="#16a34a55" />
              <Area type="monotone" dataKey="shpenzime" stroke="#dc2626" fill="#dc262655" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Statuset e projekteve</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {statusChart.map((row) => (
            <div key={row.name} className="flex justify-between border rounded-md p-2">
              <span>{row.name}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Fitim vs Humbje sipas projekteve</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitLossChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rezultat" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ore pune per punetor (muaji aktual)</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workerHoursChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ore" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Automatizimi mujor</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Raporti mujor gjenerohet me Supabase Edge Function ne diten e pare te muajit dhe dergohet permes Resend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
