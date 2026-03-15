import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notificationApi } from '@/lib/erp-api';
import type { NotificationItem } from '@/lib/erp-types';

const NotificationsPage = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Njoftime</h2>
        <Button onClick={runChecks} disabled={actionId === 'run-checks'}>
          {actionId === 'run-checks' ? 'Duke kontrolluar...' : 'Kontrollo afatet tani'}
        </Button>
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

          {!loading && visibleItems.map((item) => (
            <div key={item.id} className={`border rounded p-3 ${item.is_read ? 'opacity-70' : ''}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString('sq-AL')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.is_read && (
                    <Button size="sm" variant="outline" onClick={() => markRead(item.id)} disabled={actionId === item.id}>
                      Lexuar
                    </Button>
                  )}
                  {!item.is_archived ? (
                    <Button size="sm" variant="outline" onClick={() => archive(item.id)} disabled={actionId === item.id}>
                      Arkivo
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => unarchive(item.id)} disabled={actionId === item.id}>
                      Rikthe
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)} disabled={actionId === item.id}>
                    Fshi
                  </Button>
                </div>
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
