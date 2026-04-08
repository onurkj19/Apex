import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { Calendar } from '@/components/ui/calendar';
import { notificationApi } from '@/lib/erp-api';
import type { NotificationItem } from '@/lib/erp-types';
import { getNotificationActivityDate, toLocalDateKey } from '@/lib/notification-dates';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DestructiveConfirmDialog } from '@/components/admin/DestructiveConfirmDialog';

const NotificationsPage = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [monthView, setMonthView] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [singleDeleteOpen, setSingleDeleteOpen] = useState(false);
  const [pendingSingleDeleteId, setPendingSingleDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

  const askRemoveItem = (id: string) => {
    setPendingSingleDeleteId(id);
    setSingleDeleteOpen(true);
  };

  const performRemoveItem = async () => {
    if (!pendingSingleDeleteId) return;
    const id = pendingSingleDeleteId;
    setActionId(id);
    try {
      await notificationApi.remove(id);
      await load();
    } finally {
      setActionId(null);
      setPendingSingleDeleteId(null);
    }
  };

  const visibleItems = items.filter((item) => {
    if (filter === 'active') return !item.is_archived;
    if (filter === 'archived') return !!item.is_archived;
    return true;
  });

  const activityMatcher = useMemo(
    () => (date: Date) =>
      visibleItems.some(
        (item) => toLocalDateKey(getNotificationActivityDate(item)) === toLocalDateKey(date),
      ),
    [visibleItems],
  );

  const listForDay = useMemo(() => {
    if (!selectedDay) return visibleItems;
    const key = toLocalDateKey(selectedDay);
    return visibleItems.filter((item) => toLocalDateKey(getNotificationActivityDate(item)) === key);
  }, [visibleItems, selectedDay]);

  useEffect(() => {
    setSelectedDay(undefined);
  }, [filter]);

  useEffect(() => {
    const allowed = new Set(listForDay.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [listForDay]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    setSelectionMode(true);
    setSelectedIds(listForDay.map((item) => item.id));
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

  const askRemoveSelected = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteOpen(true);
  };

  const performRemoveSelected = async () => {
    if (selectedIds.length === 0) return;
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
              { label: 'Select all', onClick: selectAllVisible, disabled: listForDay.length === 0 },
              { label: 'Mark selected as read', onClick: markSelectedRead, disabled: selectedIds.length === 0 },
              { label: 'Delete selected', onClick: askRemoveSelected, disabled: selectedIds.length === 0, destructive: true },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Kalendari i aktivitetit</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Muaji aktual sipas parazgjedhjes; përdor shigjetat për muajt e kaluar ose të ardhshëm. Pika e kuqe =
              të paktën një njoftim në atë datë (sipas filtër aktual).
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            <Calendar
              mode="single"
              locale={de}
              weekStartsOn={1}
              month={monthView}
              onMonthChange={setMonthView}
              selected={selectedDay}
              onSelect={setSelectedDay}
              modifiers={{ has_activity: activityMatcher }}
              modifiersClassNames={{
                has_activity:
                  'relative font-medium text-foreground after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-red-500 after:content-[""]',
              }}
              className="rounded-md border bg-muted/20 p-2 w-full max-w-[340px]"
              classNames={{
                day: cn(
                  buttonVariants({ variant: 'ghost' }),
                  'h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative overflow-visible',
                ),
              }}
            />
            <div className="mt-3 flex w-full max-w-[340px] flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                Ka aktivitet
              </span>
              {selectedDay && (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDay(undefined)}>
                  Hiq filtrin e datës
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Njoftimet e sistemit</CardTitle>
            {selectedDay && (
              <p className="text-sm text-muted-foreground font-normal">
                Po shfaqen vetëm njoftimet për{' '}
                <strong>{selectedDay.toLocaleDateString('sq-AL', { dateStyle: 'long' })}</strong> ({listForDay.length}{' '}
                {listForDay.length === 1 ? 'njoftim' : 'njoftime'}).
              </p>
            )}
          </CardHeader>
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

          {!loading && listForDay.map((item) => (
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
                    { label: 'Fshi', onClick: () => askRemoveItem(item.id), disabled: actionId === item.id, destructive: true },
                  ]}
                />
              </div>
            </div>
          ))}
          {!loading && listForDay.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedDay ? 'Nuk ka njoftime për këtë datë me këtë filtër.' : 'Nuk ka njoftime.'}
            </p>
          )}
        </CardContent>
      </Card>

      <DestructiveConfirmDialog
        open={singleDeleteOpen}
        onOpenChange={(o) => {
          setSingleDeleteOpen(o);
          if (!o) setPendingSingleDeleteId(null);
        }}
        title="Fshi njoftimin?"
        description="A dëshiron ta fshish këtë njoftim? Ky veprim nuk kthehet lehtë."
        confirmLabel="Po, fshi"
        loading={Boolean(pendingSingleDeleteId && actionId === pendingSingleDeleteId)}
        onConfirm={performRemoveItem}
      />
      <DestructiveConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Fshi njoftimet e zgjedhura?"
        description={`A dëshiron t'i fshish ${selectedIds.length} njoftime? Ky veprim nuk kthehet lehtë.`}
        confirmLabel="Po, fshi të gjitha"
        loading={actionId === 'bulk-remove'}
        onConfirm={performRemoveSelected}
      />
      </div>
    </div>
  );
};

export default NotificationsPage;
