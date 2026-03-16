import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi, workerApi, workerTimeApi } from '@/lib/erp-api';
import type { WorkerTimeEntry } from '@/lib/erp-types';

const WorkApprovalsPage = () => {
  const [rows, setRows] = useState<WorkerTimeEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | WorkerTimeEntry['status']>('submitted');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [workersMap, setWorkersMap] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [timeRows, users, workers] = await Promise.all([
        workerTimeApi.listForApproval(statusFilter),
        authApi.listAppUsers(),
        workerApi.list(),
      ]);
      setRows(timeRows);
      setUsersMap(
        (users || []).reduce<Record<string, string>>((acc, row: any) => {
          acc[row.id] = row.full_name || row.email || row.id;
          return acc;
        }, {}),
      );
      setWorkersMap(
        (workers || []).reduce<Record<string, string>>((acc, row: any) => {
          acc[row.id] = row.full_name || row.id;
          return acc;
        }, {}),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter]);

  const orderedRows = useMemo(
    () => [...rows].sort((a, b) => `${b.work_date} ${b.start_at}`.localeCompare(`${a.work_date} ${a.start_at}`)),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Aprovimi i oreve ditore</h2>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? 'Duke ngarkuar...' : 'Rifresko'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro statusin</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | WorkerTimeEntry['status'])}
          >
            <option value="submitted">Ne pritje aprovimi</option>
            <option value="approved">Aprovuar</option>
            <option value="rejected">Refuzuar</option>
            <option value="running">Ne pune (aktiv)</option>
            <option value="all">Te gjitha</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista e oreve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedRows.map((row) => (
            <div key={row.id} className="border rounded-md p-3 space-y-1">
              <p className="font-medium">
                {usersMap[row.worker_user_id] || row.worker_user_id}
                {row.worker_id ? ` (${workersMap[row.worker_id] || row.worker_id})` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Data: {row.work_date} | Start: {new Date(row.start_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                {row.end_at
                  ? ` | Stop: ${new Date(row.end_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </p>
              <p className="text-sm">
                Ore te llogaritura: {((Number(row.worked_minutes || 0) || 0) / 60).toFixed(2)}h | Statusi: {row.status}
              </p>
              {row.super_admin_comment && <p className="text-xs text-muted-foreground">Koment admini: {row.super_admin_comment}</p>}
              {row.status === 'submitted' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={actionId === row.id}
                    onClick={async () => {
                      setActionId(row.id);
                      try {
                        const comment = prompt('Koment (opsionale):', 'Aprovuar');
                        await workerTimeApi.approve(row.id, comment || undefined);
                        await load();
                      } finally {
                        setActionId(null);
                      }
                    }}
                  >
                    Aprovo
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionId === row.id}
                    onClick={async () => {
                      setActionId(row.id);
                      try {
                        const comment = prompt('Arsyeja e refuzimit:', 'Te lutem korrigjo orarin.');
                        await workerTimeApi.reject(row.id, comment || undefined);
                        await load();
                      } finally {
                        setActionId(null);
                      }
                    }}
                  >
                    Refuzo
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!loading && orderedRows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka regjistrime per kete filter.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkApprovalsPage;
