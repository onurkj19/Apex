import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { projectApi, PROJECT_RECYCLE_RETENTION_DAYS } from '@/lib/erp-api';
import type { Project } from '@/lib/erp-types';
import { DestructiveConfirmDialog } from '@/components/admin/DestructiveConfirmDialog';

const MS_PER_DAY = 86_400_000;

function daysUntilPurge(deletedAt: string | null | undefined): number {
  if (!deletedAt) return PROJECT_RECYCLE_RETENTION_DAYS;
  const purgeAt = new Date(deletedAt).getTime() + PROJECT_RECYCLE_RETENTION_DAYS * MS_PER_DAY;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / MS_PER_DAY));
}

const RecycleBinPage = () => {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [purgeInfo, setPurgeInfo] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const removed = await projectApi.purgeExpiredDeletedProjects();
      if (removed > 0) {
        setPurgeInfo(`${removed} projekt(ë) u hoqën përfundimisht (mbi ${PROJECT_RECYCLE_RETENTION_DAYS} ditë në kosh).`);
      } else {
        setPurgeInfo(null);
      }
      const rows = await projectApi.listDeleted();
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const askRestore = (id: string) => {
    setPendingRestoreId(id);
    setRestoreOpen(true);
  };

  const confirmRestore = async () => {
    if (!pendingRestoreId) return;
    setRestoreLoading(true);
    try {
      await projectApi.restore(pendingRestoreId);
      await load();
    } finally {
      setRestoreLoading(false);
      setPendingRestoreId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Koshi (Recycle Bin)</h2>
          <p className="text-sm text-muted-foreground">
            Projektet e fshira qëndrojnë këtu. Pas {PROJECT_RECYCLE_RETENTION_DAYS} ditësh fshihen përfundimisht.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? 'Duke rifreskuar...' : 'Rifresko'}
        </Button>
      </div>

      {purgeInfo && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {purgeInfo}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Projekte të fshira</CardTitle>
          <CardDescription>
            Rikthe një projekt për ta kthyer në listën kryesore, përpara se të skadojë afati.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Koshi është bosh.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Projekti</th>
                    <th className="p-3 font-medium">Lokacioni</th>
                    <th className="p-3 font-medium">Fshirë më</th>
                    <th className="p-3 font-medium">Ditë deri në fshirje përfundimtare</th>
                    <th className="p-3 font-medium w-[140px]">Veprime</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.project_name}</td>
                      <td className="p-3 text-muted-foreground">{p.location}</td>
                      <td className="p-3 text-muted-foreground">
                        {p.deleted_at
                          ? new Date(p.deleted_at).toLocaleString('sq-AL', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                      <td className="p-3">{daysUntilPurge(p.deleted_at)}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={restoreLoading}
                          onClick={() => askRestore(p.id)}
                        >
                          Rikthe
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DestructiveConfirmDialog
        open={restoreOpen}
        onOpenChange={(o) => {
          setRestoreOpen(o);
          if (!o) setPendingRestoreId(null);
        }}
        title="Rikthe projektin?"
        description="A dëshiron ta rikthesh këtë projekt në listën aktive të projekteve?"
        confirmLabel="Po, rikthe"
        cancelLabel="Anulo"
        loading={restoreLoading}
        confirmVariant="default"
        onConfirm={confirmRestore}
      />
    </div>
  );
};

export default RecycleBinPage;
