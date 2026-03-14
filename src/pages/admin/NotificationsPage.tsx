import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notificationApi } from '@/lib/erp-api';

const NotificationsPage = () => {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => setItems(await notificationApi.list());

  useEffect(() => {
    load();
  }, []);

  const runChecks = async () => {
    await notificationApi.runChecks();
    await load();
  };

  const markRead = async (id: string) => {
    await notificationApi.markRead(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Njoftime</h2>
        <Button onClick={runChecks}>Kontrollo afatet tani</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Njoftimet e sistemit</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className={`border rounded p-3 ${item.is_read ? 'opacity-70' : ''}`}>
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString('sq-AL')}</p>
                </div>
                {!item.is_read && <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>Lexuar</Button>}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka njoftime.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
