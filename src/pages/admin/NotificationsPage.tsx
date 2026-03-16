import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { notificationApi } from '@/lib/erp-api';
import type { NotificationItem } from '@/lib/erp-types';

const NotificationsPage = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await notificationApi.list(true));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runChecks = async () => {
    setActionId('run-checks');
    try {
      await notificationApi.runChecks();
      await load();
    } finally {
      setActionId(null);
    }
  };

  const markRead = async (id: string) => {
    setActionId(id);
    try {
      await notificationApi.markRead(id);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const archive = async (id: string) => {
    setActionId(id);
    try {
      await notificationApi.archive(id);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const unarchive = async (id: string) => {
    setActionId(id);
    try {
      await notificationApi.unarchive(id);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const removeItem = async (id: string) => {
    if (!window.confirm('A je i sigurt qe do ta fshish kete njoftim?')) return;
    setActionId(id);
    try {
      await notificationApi.remove(id);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const visibleItems = items.filter((item) => {
    if (filter === 'active') return !item.is_archived;
    if (filter === 'archived') return !!item.is_archived;
    return true;
  });

  useEffect(() => {
    const visibleSet = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => visibleSet.has(id)));
  }, [items, filter]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    setSelectionMode(true);
    setSelectedIds(visibleItems.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const markSelectedRead = async () => {
    if (selectedIds.length === 0) return;
    setActionId('bulk-mark-read');
    try {
      await Promise.all(selectedIds.map((id) => notificationApi.markRead(id)));
      await load();
      clearSelection();
    } finally {
      setActionId(null);
    }
  };

  const removeSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`A je i sigurt qe do t'i fshish ${selectedIds.length} njoftime?`)) return;
    setActionId('bulk-remove');
    try {
      await Promise.all(selectedIds.map((id) => notificationApi.remove(id)));
      await load();
      clearSelection();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Njoftime</h2>
        <div className="flex items-center gap-2">
          <Button onClick={runChecks} disabled={actionId === 'run-checks'}>
            {actionId === 'run-checks' ? 'Duke kontrolluar...' : 'Kontrollo afatet tani'}
          </Button>
          <RowActionsMenu
            disabled={loading || actionId === 'run-checks' || actionId === 'bulk-mark-read' || actionId === 'bulk-remove'}
            actions={[
              {
                label: selectionMode ? 'Hiq Select' : 'Select',
                onClick: () => {
                  if (selectionMode) clearSelection();
                  else setSelectionMode(true);
                },
              },
              { label: 'Select all', onClick: selectAllVisible, disabled: visibleItems.length === 0 },
              { label: 'Mark selected as read', onClick: markSelectedRead, disabled: selectedIds.length === 0 },
              { label: 'Delete selected', onClick: removeSelected, disabled: selectedIds.length === 0, destructive: true },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Njoftimet e sistemit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>
              Aktive
            </Button>
            <Button size="sm" variant={filter === 'archived' ? 'default' : 'outline'} onClick={() => setFilter('archived')}>
              Te arkivuara
            </Button>
            <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
              Te gjitha
            </Button>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar njoftimet...</p>}

          {!loading && selectionMode && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm flex items-center justify-between">
              <span>{selectedIds.length} te zgjedhura</span>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Anulo zgjedhjen
              </Button>
            </div>
          )}

          {!loading && visibleItems.map((item) => (
            <div key={item.id} className={`border rounded p-3 ${item.is_read ? 'opacity-70' : ''}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 flex-1">
                  {selectionMode && (
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelected(item.id)}
                      />
                      Zgjidh
                    </label>
                  )}
                  {(() => {
                    const metadata = (item.metadata || {}) as Record<string, unknown>;
                    const actorName = String(metadata.actor_admin_name || '');
                    const actorEmail = String(metadata.actor_admin_email || '');
                    const actionAtRaw = String(metadata.action_at || '');
                    const actionAt = actionAtRaw ? new Date(actionAtRaw) : null;
                    const createdAt = new Date(item.created_at);
                    return (
                      <>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Ndryshimi: {(actionAt && !Number.isNaN(actionAt.getTime()) ? actionAt : createdAt).toLocaleString('sq-AL')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Nga admini: {actorName ? `${actorName}${actorEmail ? ` (${actorEmail})` : ''}` : (actorEmail || 'Sistemi')}
                        </p>
                      </>
                    );
                  })()}
                </div>
                <RowActionsMenu
                  disabled={actionId === item.id}
                  actions={[
                    ...(!item.is_read
                      ? [{ label: 'Lexuar', onClick: () => markRead(item.id), disabled: actionId === item.id }]
                      : []),
                    !item.is_archived
                      ? { label: 'Arkivo', onClick: () => archive(item.id), disabled: actionId === item.id }
                      : { label: 'Rikthe', onClick: () => unarchive(item.id), disabled: actionId === item.id },
                    { label: 'Fshi', onClick: () => removeItem(item.id), disabled: actionId === item.id, destructive: true },
                  ]}
                />
              </div>
            </div>
          ))}
          {!loading && visibleItems.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka njoftime.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
