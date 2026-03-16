import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/erp-api';
import type { DashboardStats } from '@/lib/erp-types';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import supabase from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/use-admin-auth';

const DashboardPage = () => {
  const { profile } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [financeChart, setFinanceChart] = useState<any[]>([]);
  const [statusChart, setStatusChart] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [trend, setTrend] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      const [statsRes, financeRes, statusRes, notificationsRes, trendRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getMonthlyFinance(),
        dashboardApi.getProjectStatusDistribution(),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5),
        dashboardApi.getTrendAlarms(),
      ]);
      setStats(statsRes);
      setFinanceChart(financeRes);
      setStatusChart(statusRes);
      setNotifications(notificationsRes.data || []);
      setTrend(trendRes);
    };
    load();
  }, []);

  const boxes = [
    { label: 'Total Projekte', value: stats?.total_projects ?? 0 },
    { label: 'Projekte Aktive', value: stats?.active_projects ?? 0 },
    { label: 'Projekte Perfunduara', value: stats?.completed_projects ?? 0 },
    { label: 'Te ardhura mujore', value: `${(stats?.monthly_revenue ?? 0).toFixed(2)} CHF` },
    { label: 'Shpenzime mujore', value: `${(stats?.monthly_expenses ?? 0).toFixed(2)} CHF` },
    { label: 'Bilanci i kompanise', value: `${(stats?.company_balance ?? 0).toFixed(2)} CHF` },
  ];

  const roleWidgets = [
    {
      key: 'finance',
      visible: ['finance', 'super_admin', 'admin'].includes(profile?.role || ''),
      title: 'Finance Focus',
      content: `Expense spike: ${Number(trend?.metrics?.expenseSpikePct || 0).toFixed(1)}% | Margin: ${Number(trend?.metrics?.currentMargin || 0).toFixed(1)}%`,
    },
    {
      key: 'pm',
      visible: ['project_manager', 'super_admin', 'admin'].includes(profile?.role || ''),
      title: 'Project Delivery',
      content: `Aktive: ${trend?.metrics?.activeProjects || 0} | Me progres te ulet: ${trend?.metrics?.stalledProjects || 0}`,
    },
    {
      key: 'viewer',
      visible: profile?.role === 'viewer',
      title: 'Viewer Summary',
      content: 'Ke akses vetem per lexim ne modulet kryesore.',
    },
  ].filter((x) => x.visible);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {boxes.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {trend && (
        <Card>
          <CardHeader>
            <CardTitle>Trend Alarms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(trend.alarms || []).length === 0 && <p className="text-sm text-muted-foreground">Nuk ka alarme kritike per momentin.</p>}
            {(trend.alarms || []).map((alarm: any) => (
              <div key={alarm.type} className="border rounded-md p-3">
                <p className="font-medium">{alarm.message}</p>
                <p className="text-sm text-muted-foreground">
                  Severiteti: {alarm.severity} | Vlera: {Number(alarm.value || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {roleWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleWidgets.map((widget) => (
            <Card key={widget.key}>
              <CardHeader>
                <CardTitle>{widget.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{widget.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Te ardhura vs shpenzime (muaj)</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="teArdhura" fill="#16a34a" />
                <Bar dataKey="shpenzime" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shperndarja e statusit te projekteve</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" outerRadius={110} fill="#3b82f6" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Njoftime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka njoftime.</p>}
          {notifications.map((item) => (
            <div key={item.id} className="border rounded-md p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
