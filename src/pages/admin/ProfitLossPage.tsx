import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { projectApi } from '@/lib/erp-api';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ProfitLossPage = () => {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await projectApi.getProfitLoss();
      setRows(data);
    };
    load();
  }, []);

  const totalProfitLoss = rows.reduce((sum, r) => sum + Number(r.profit_loss || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Fitim / Humbje per projekt</h2>

      <Card>
        <CardHeader><CardTitle>Rezultati total</CardTitle></CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalProfitLoss.toFixed(2)} CHF
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grafik i fitim/humbjes</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="project_name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="profit_loss" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detajet sipas projektit</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="border rounded p-3">
              <p className="font-medium">{row.project_name}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mt-2">
                <span>Te ardhura: {row.revenue.toFixed(2)} CHF</span>
                <span>Kosto punetoresh: {row.worker_cost.toFixed(2)} CHF</span>
                <span>Ore pune: {Number(row.worker_hours || 0).toFixed(2)} h</span>
                <span>Shpenzime: {row.expenses.toFixed(2)} CHF</span>
                <span className={row.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}>
                  Rezultati: {row.profit_loss.toFixed(2)} CHF
                </span>
              </div>
              {Number(row.worker_cost_logs || 0) > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Kosto e punetoreve po merret automatikisht nga oret e punes (Work Logs).
                </p>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka te dhena financiare per projekte.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLossPage;
