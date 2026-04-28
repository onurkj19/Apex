import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { notificationApi } from '@/lib/erp-api';
import type { NotificationItem } from '@/lib/erp-types';
import { getNotificationActivityDate, toLocalDateKey } from '@/lib/notification-dates';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DestructiveConfirmDialog } from '@/components/admin/DestructiveConfirmDialog';
import { Bell, Archive, Trash2, CheckCheck, RefreshCw } from 'lucide-react';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Njoftime</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={runChecks} disabled={actionId === 'run-checks'} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', actionId === 'run-checks' && 'animate-spin')} />
            {actionId === 'run-checks' ? 'Duke kontrolluar...' : 'Kontrollo afatet'}
          </Button>
          {!selectionMode ? (
            <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>Selekto</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={listForDay.length === 0}>Selekto të gjitha</Button>
              <Button variant="outline" size="sm" onClick={markSelectedRead} disabled={selectedIds.length === 0} className="gap-1.5">
                <CheckCheck className="h-4 w-4" /> Lexuar ({selectedIds.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={askRemoveSelected} disabled={selectedIds.length === 0} className="gap-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Fshi ({selectedIds.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>Anulo</Button>
            </>
          )}
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
            <div key={item.id} className={cn('rounded-xl border border-border/70 p-3', item.is_read && 'opacity-60')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <Bell className="h-4 w-4" />
                  </div>
              <div className="space-y-1 flex-1 min-w-0">
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
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-end">
                  {!item.is_read && (
                    <Button size="sm" variant="outline" disabled={actionId === item.id} onClick={() => markRead(item.id)} className="gap-1 text-xs h-7 px-2">
                      <CheckCheck className="h-3 w-3" /> Lexuar
                    </Button>
                  )}
                  {!item.is_archived ? (
                    <Button size="sm" variant="outline" disabled={actionId === item.id} onClick={() => archive(item.id)} className="gap-1 text-xs h-7 px-2">
                      <Archive className="h-3 w-3" /> Arkivo
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={actionId === item.id} onClick={() => unarchive(item.id)} className="text-xs h-7 px-2">
                      Rikthe
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={actionId === item.id} onClick={() => askRemoveItem(item.id)} className="gap-1 text-xs h-7 px-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" /> Fshi
                  </Button>
                </div>
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
