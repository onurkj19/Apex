import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi, leaveRequestApi, workerPortalApi, workerTimeApi } from '@/lib/erp-api';
import type { DashboardStats, LeaveRequest, WorkerTimeEntry } from '@/lib/erp-types';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import supabase from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatChf } from '@/lib/utils';
import { TeamPlanAttachmentsView } from '@/components/TeamPlanAttachmentsView';
import { Truck } from 'lucide-react';

const DashboardPage = () => {
  const { profile } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [financeChart, setFinanceChart] = useState<any[]>([]);
  const [statusChart, setStatusChart] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [trend, setTrend] = useState<any | null>(null);
  const [workerPlans, setWorkerPlans] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [todayTimeEntry, setTodayTimeEntry] = useState<WorkerTimeEntry | null>(null);
  const [recentTimeEntries, setRecentTimeEntries] = useState<WorkerTimeEntry[]>([]);
  const [timeActionLoading, setTimeActionLoading] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [leaveForm, setLeaveForm] = useState({
    request_type: 'day_off' as LeaveRequest['request_type'],
    requested_start_date: new Date().toISOString().slice(0, 10),
    requested_end_date: new Date().toISOString().slice(0, 10),
    worker_comment: '',
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      if (profile?.role === 'worker') {
        const [plans, leaves, todayEntry, recentEntries] = await Promise.all([
          workerPortalApi.getAssignedPlans(),
          leaveRequestApi.listMine(),
          workerTimeApi.getMyTodayEntry(),
          workerTimeApi.listMineRecent(10),
        ]);
        setWorkerPlans(plans);
        setLeaveRequests(leaves);
        setTodayTimeEntry(todayEntry);
        setRecentTimeEntries(recentEntries);
        return;
      }

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
    void load();
  }, [profile?.role]);

  const boxes = [
    { label: 'Total Projekte', value: stats?.total_projects ?? 0 },
    { label: 'Projekte Aktive', value: stats?.active_projects ?? 0 },
    { label: 'Projekte Perfunduara', value: stats?.completed_projects ?? 0 },
    { label: 'Te ardhura mujore', value: formatChf(stats?.monthly_revenue ?? 0) },
    { label: 'Shpenzime mujore', value: formatChf(stats?.monthly_expenses ?? 0) },
    { label: 'Bilanci i kompanise', value: formatChf(stats?.company_balance ?? 0) },
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

  const refreshWorkerData = async () => {
    const [plans, leaves, todayEntry, recentEntries] = await Promise.all([
      workerPortalApi.getAssignedPlans(),
      leaveRequestApi.listMine(),
      workerTimeApi.getMyTodayEntry(),
      workerTimeApi.listMineRecent(10),
    ]);
    setWorkerPlans(plans);
    setLeaveRequests(leaves);
    setTodayTimeEntry(todayEntry);
    setRecentTimeEntries(recentEntries);
  };

  useEffect(() => {
    if (profile?.role !== 'worker') return;
    const interval = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [profile?.role]);

  const getLiveWorkedMinutes = () => {
    if (!todayTimeEntry) return 0;
    if (todayTimeEntry.status !== 'running' || !todayTimeEntry.start_at) {
      return Number(todayTimeEntry.worked_minutes || 0);
    }
    const start = new Date(todayTimeEntry.start_at);
    const end = new Date(nowTick);
    const gross = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
    const y = start.getFullYear();
    const m = start.getMonth();
    const d = start.getDate();
    const overlap = (s1: Date, e1: Date, s2: Date, e2: Date) => {
      const s = Math.max(s1.getTime(), s2.getTime());
      const e = Math.min(e1.getTime(), e2.getTime());
      if (e <= s) return 0;
      return Math.floor((e - s) / 60000);
    };
    const b1 = overlap(start, end, new Date(y, m, d, 9, 0, 0, 0), new Date(y, m, d, 9, 30, 0, 0));
    const b2 = overlap(start, end, new Date(y, m, d, 12, 0, 0, 0), new Date(y, m, d, 13, 0, 0, 0));
    return Math.max(0, gross - b1 - b2);
  };

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Duke ngarkuar profilin...</p>;
  }

  if (profile?.role === 'worker') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard i Punetorit</h2>

        <Card>
          <CardHeader>
            <CardTitle>Oraret e dites (Start / Stop)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pauzat fikse nuk llogariten automatikisht: 09:00-09:30 dhe 12:00-13:00.
            </p>
            {todayTimeEntry?.status === 'running' ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Sesioni aktiv nga: {new Date(todayTimeEntry.start_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="font-medium">Ore efektive deri tani: {(getLiveWorkedMinutes() / 60).toFixed(2)}h</p>
                <Button
                  disabled={timeActionLoading}
                  onClick={async () => {
                    setTimeActionLoading(true);
                    try {
                      await workerTimeApi.stopDay();
                      await refreshWorkerData();
                    } finally {
                      setTimeActionLoading(false);
                    }
                  }}
                >
                  {timeActionLoading ? 'Duke ndalur...' : 'Stop dhe dergo per aprovim'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  Statusi i sotem: {todayTimeEntry ? todayTimeEntry.status : 'Nuk ka sesion te regjistruar'}
                </p>
                <Button
                  disabled={timeActionLoading}
                  onClick={async () => {
                    setTimeActionLoading(true);
                    try {
                      await workerTimeApi.startDay();
                      await refreshWorkerData();
                    } finally {
                      setTimeActionLoading(false);
                    }
                  }}
                >
                  {timeActionLoading ? 'Duke filluar...' : 'Start'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Planning (detyrat e mia)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workerPlans.length === 0 && <p className="text-sm text-muted-foreground">Nuk ke plane aktive.</p>}
            {workerPlans.map((plan) => (
              <div key={plan.id} className="border rounded-md p-3 space-y-2">
                <p className="font-medium">{plan.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(plan.plan_date).toLocaleDateString('sq-AL')} — {plan.location || 'Pa lokacion'}
                </p>
                <p className="text-sm text-muted-foreground">Statusi: {plan.status}</p>
                {plan.vehicle_label && (
                  <p className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      Furgoni / mjeti: <span className="text-foreground font-medium">{plan.vehicle_label}</span>
                    </span>
                  </p>
                )}
                {plan.trailer_required && (
                  <p className="text-sm text-amber-600 font-medium">Rimorkio: kërkohet po</p>
                )}
                {plan.task_details && <p className="text-sm mt-1 whitespace-pre-wrap">{plan.task_details}</p>}
                {plan.notes && (
                  <p className="text-sm text-muted-foreground border-l-2 pl-2 italic">Shënim: {plan.notes}</p>
                )}
                {plan.attachments && plan.attachments.length > 0 && (
                  <TeamPlanAttachmentsView items={plan.attachments} />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historiku i oreve ditore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTimeEntries.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka regjistrime ende.</p>}
            {recentTimeEntries.map((entry) => (
              <div key={entry.id} className="border rounded-md p-3">
                <p className="font-medium">{entry.work_date}</p>
                <p className="text-sm text-muted-foreground">
                  Start: {new Date(entry.start_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                  {entry.end_at
                    ? ` | Stop: ${new Date(entry.end_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </p>
                <p className="text-sm">Ore efektive: {(Number(entry.worked_minutes || 0) / 60).toFixed(2)}h</p>
                <p className="text-xs text-muted-foreground">Statusi: {entry.status}</p>
                {entry.super_admin_comment && (
                  <p className="text-xs text-muted-foreground">Koment admini: {entry.super_admin_comment}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kerko dite te lire / pushim vjetor</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmittingLeave(true);
                try {
                  await leaveRequestApi.createMine(leaveForm);
                  setLeaveForm((s) => ({ ...s, worker_comment: '' }));
                  await refreshWorkerData();
                } finally {
                  setSubmittingLeave(false);
                }
              }}
            >
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={leaveForm.request_type}
                onChange={(e) => setLeaveForm((s) => ({ ...s, request_type: e.target.value as LeaveRequest['request_type'] }))}
              >
                <option value="day_off">Dite e lire</option>
                <option value="annual_leave">Pushim vjetor</option>
              </select>
              <Input
                type="date"
                value={leaveForm.requested_start_date}
                onChange={(e) => setLeaveForm((s) => ({ ...s, requested_start_date: e.target.value }))}
              />
              <Input
                type="date"
                value={leaveForm.requested_end_date}
                onChange={(e) => setLeaveForm((s) => ({ ...s, requested_end_date: e.target.value }))}
              />
              <Input
                placeholder="Shenim (opsionale)"
                value={leaveForm.worker_comment}
                onChange={(e) => setLeaveForm((s) => ({ ...s, worker_comment: e.target.value }))}
              />
              <div className="md:col-span-2">
                <Button type="submit" disabled={submittingLeave}>
                  {submittingLeave ? 'Duke derguar...' : 'Dergo kerkesen'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kerkesat e mia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaveRequests.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka kerkesa ende.</p>}
            {leaveRequests.map((req) => (
              <div key={req.id} className="border rounded-md p-3 space-y-1">
                <p className="font-medium">
                  {req.request_type === 'annual_leave' ? 'Pushim vjetor' : 'Dite e lire'} ({req.requested_start_date} - {req.requested_end_date})
                </p>
                <p className="text-sm text-muted-foreground">Statusi: {req.status}</p>
                {req.admin_comment && <p className="text-sm">Admini: {req.admin_comment}</p>}
                {req.status === 'counter_offered' && (
                  <div className="mt-2 p-2 rounded bg-muted/20 space-y-2">
                    <p className="text-sm">
                      Kunderoferte: {req.admin_counter_start_date || '-'} deri {req.admin_counter_end_date || '-'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await leaveRequestApi.respondToCounter(req.id, { accept: true, worker_comment: 'Pranuar' });
                          await refreshWorkerData();
                        }}
                      >
                        Prano daten
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const start = prompt('Data e re nga (YYYY-MM-DD):', req.requested_start_date);
                          const end = prompt('Data e re deri (YYYY-MM-DD):', req.requested_end_date);
                          if (!start || !end) return;
                          await leaveRequestApi.respondToCounter(req.id, {
                            accept: false,
                            new_start_date: start,
                            new_end_date: end,
                            worker_comment: 'Kunderoferte nga punetori',
                          });
                          await refreshWorkerData();
                        }}
                      >
                        Ofro date tjeter
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

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
