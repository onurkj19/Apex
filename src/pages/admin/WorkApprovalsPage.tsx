import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi, workerApi, workerTimeApi } from '@/lib/erp-api';
import type { WorkerTimeEntry } from '@/lib/erp-types';
import { CheckCircle, XCircle, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  running:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const WorkApprovalsPage = () => {
  const [rows, setRows] = useState<WorkerTimeEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | WorkerTimeEntry['status']>('submitted');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [workersMap, setWorkersMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [timeRows, users, workers] = await Promise.all([
        workerTimeApi.listForApproval(statusFilter),
        authApi.listAppUsers(),
        workerApi.list(),
      ]);
      setRows(timeRows);
      setUsersMap((users || []).reduce<Record<string, string>>((acc, row: any) => { acc[row.id] = row.full_name || row.email || row.id; return acc; }, {}));
      setWorkersMap((workers || []).reduce<Record<string, string>>((acc, row: any) => { acc[row.id] = row.full_name || row.id; return acc; }, {}));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [statusFilter]);

  const orderedRows = useMemo(() =>
    [...rows].sort((a, b) => `${b.work_date} ${b.start_at}`.localeCompare(`${a.work_date} ${a.start_at}`)),
    [rows]);

  const approve = async (row: WorkerTimeEntry) => {
    setActionId(row.id);
    try {
      const comment = prompt('Koment (opsionale):', 'Aprovuar');
      await workerTimeApi.approve(row.id, comment || undefined);
      await load();
    } finally { setActionId(null); }
  };

  const reject = async (row: WorkerTimeEntry) => {
    setActionId(row.id);
    try {
      const comment = prompt('Arsyeja e refuzimit:', 'Te lutem korrigjo orarin.');
      await workerTimeApi.reject(row.id, comment || undefined);
      await load();
    } finally { setActionId(null); }
  };

  const counts = {
    submitted: rows.filter(r => r.status === 'submitted').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Aprovimi i oreve ditore</h2>
        <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Rifresko
        </Button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['submitted','Në pritje', 'text-amber-600'],
          ['approved','Aprovuar', 'text-emerald-600'],
          ['rejected','Refuzuar', 'text-red-500'],
        ] as const).map(([key, label, cls]) => (
          <Card key={key} className="cursor-pointer" onClick={() => setStatusFilter(prev => prev === key ? 'all' : key)}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={cn('text-2xl font-bold tabular-nums', cls)}>{counts[key]}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtrat */}
      <div className="flex flex-wrap gap-1.5">
        {([
          ['submitted','Në pritje'],
          ['approved','Aprovuar'],
          ['rejected','Refuzuar'],
          ['running','Aktive'],
          ['all','Të gjitha'],
        ] as const).map(([val, label]) => (
          <button key={val} type="button" onClick={() => setStatusFilter(val)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              statusFilter === val ? 'bg-foreground text-background border-foreground' : 'bg-muted text-muted-foreground border-border hover:bg-accent')}>
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Orët e punës ({orderedRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>}
          {!loading && orderedRows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka regjistrime për këtë filtër.</p>}
          {!loading && orderedRows.map((row) => {
            const isExpanded = expandedId === row.id;
            const hours = ((Number(row.worked_minutes || 0)) / 60).toFixed(2);
            const workerName = usersMap[row.worker_user_id] || row.worker_user_id;
            const workerDbName = row.worker_id ? (workersMap[row.worker_id] || '') : '';
            return (
              <div key={row.id} className="rounded-xl border border-border/70 overflow-hidden">
                <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(prev => prev === row.id ? null : row.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{workerName}{workerDbName ? ` · ${workerDbName}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{row.work_date} · {hours}h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[row.status] || 'bg-muted text-muted-foreground')}>{row.status}</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span><span className="text-muted-foreground">Start:</span> {new Date(row.start_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</span>
                      {row.end_at && <span><span className="text-muted-foreground">Stop:</span> {new Date(row.end_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</span>}
                      <span><span className="text-muted-foreground">Orë:</span> {hours}h</span>
                    </div>
                    {row.super_admin_comment && <p className="text-sm text-muted-foreground">Koment: {row.super_admin_comment}</p>}
                    {row.status === 'submitted' && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={actionId === row.id} onClick={() => approve(row)}>
                          <CheckCircle className="h-4 w-4" /> Aprovo
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1.5" disabled={actionId === row.id} onClick={() => reject(row)}>
                          <XCircle className="h-4 w-4" /> Refuzo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkApprovalsPage;
