import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leaveRequestApi } from '@/lib/erp-api';
import type { LeaveRequest } from '@/lib/erp-types';
import { CalendarDays, CheckCircle, XCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  pending:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  counter_offer:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const LeaveRequestsPage = () => {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const load = async () => {
    setLoading(true);
    try { setRows(await leaveRequestApi.listAll()); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const decide = async (id: string, type: 'approve' | 'reject', comment: string) => {
    setActionId(id);
    try {
      await leaveRequestApi.adminDecision(id, { type, admin_comment: comment });
      await load();
    } finally { setActionId(null); }
  };

  const counterOffer = async (req: LeaveRequest) => {
    const start = prompt('Data e kundërofertes nga (YYYY-MM-DD):', req.requested_start_date);
    const end   = prompt('Data e kundërofertes deri (YYYY-MM-DD):', req.requested_end_date);
    if (!start || !end) return;
    setActionId(req.id);
    try {
      await leaveRequestApi.adminDecision(req.id, { type: 'counter_offer', counter_start_date: start, counter_end_date: end, admin_comment: 'Ofrohet datë alternative' });
      await load();
    } finally { setActionId(null); }
  };

  const filtered = rows.filter(r => filterStatus === 'all' ? true : r.status === filterStatus);
  const counts = { pending: rows.filter(r => r.status === 'pending').length, approved: rows.filter(r => r.status === 'approved').length, rejected: rows.filter(r => r.status === 'rejected').length };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Kërkesat e pushimeve</h2>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Rifresko
        </Button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-3 gap-3">
        {([['pending','Në pritje', 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'],
           ['approved','Aprovuar', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'],
           ['rejected','Refuzuar', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300']] as const).map(([key, label, cls]) => (
          <Card key={key} className="cursor-pointer" onClick={() => setFilterStatus(prev => prev === key ? 'all' : key)}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={cn('text-2xl font-bold tabular-nums', filterStatus === key ? '' : '')}>{counts[key]}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
              {filterStatus === key && <div className={cn('mt-2 text-[10px] px-2 py-0.5 rounded-full inline-block', cls)}>Aktiv filtri</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtrat */}
      <div className="flex flex-wrap gap-1.5">
        {(['all','pending','approved','rejected'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilterStatus(f)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filterStatus === f ? 'bg-foreground text-background border-foreground' : 'bg-muted text-muted-foreground border-border hover:bg-accent')}>
            {f === 'all' ? 'Të gjitha' : f === 'pending' ? 'Në pritje' : f === 'approved' ? 'Aprovuar' : 'Refuzuar'}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Kërkesat ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar kërkesat...</p>}
          {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka kërkesa për këtë filtër.</p>}
          {!loading && filtered.map((req) => {
            const isExpanded = expandedId === req.id;
            return (
              <div key={req.id} className="rounded-xl border border-border/70 overflow-hidden">
                <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(prev => prev === req.id ? null : req.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        {req.request_type === 'annual_leave' ? 'Pushim vjetor' : 'Ditë e lirë'}
                      </p>
                      <p className="text-xs text-muted-foreground">{req.requested_start_date} → {req.requested_end_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[req.status] || 'bg-muted text-muted-foreground')}>{req.status}</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-3">
                    {req.worker_comment && <p className="text-sm"><span className="text-muted-foreground">Komenti i punëtorit:</span> {req.worker_comment}</p>}
                    {req.admin_comment && <p className="text-sm"><span className="text-muted-foreground">Komenti i adminit:</span> {req.admin_comment}</p>}
                    {req.status === 'pending' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={actionId === req.id}
                          onClick={() => decide(req.id, 'approve', 'Aprovuar')}>
                          <CheckCircle className="h-4 w-4" /> Aprovo
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1.5" disabled={actionId === req.id}
                          onClick={() => decide(req.id, 'reject', 'Refuzuar')}>
                          <XCircle className="h-4 w-4" /> Refuzo
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionId === req.id} onClick={() => counterOffer(req)}>
                          Ofro datë tjetër
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

export default LeaveRequestsPage;
