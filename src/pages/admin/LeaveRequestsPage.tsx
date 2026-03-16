import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leaveRequestApi } from '@/lib/erp-api';
import type { LeaveRequest } from '@/lib/erp-types';

const LeaveRequestsPage = () => {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await leaveRequestApi.listAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kerkesat e pushimeve</h2>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox i super adminit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar kerkesat...</p>}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka kerkesa.</p>}
          {!loading &&
            rows.map((req) => (
              <div key={req.id} className="border rounded-md p-3 space-y-2">
                <p className="font-medium">
                  {req.request_type === 'annual_leave' ? 'Pushim vjetor' : 'Dite e lire'} - {req.requested_start_date} deri {req.requested_end_date}
                </p>
                <p className="text-sm text-muted-foreground">Statusi: {req.status}</p>
                {req.worker_comment && <p className="text-sm">Punetori: {req.worker_comment}</p>}
                {req.admin_comment && <p className="text-sm">Admini: {req.admin_comment}</p>}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await leaveRequestApi.adminDecision(req.id, { type: 'approve', admin_comment: 'Aprovuar' });
                      await load();
                    }}
                  >
                    Aprovo
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await leaveRequestApi.adminDecision(req.id, { type: 'reject', admin_comment: 'Refuzuar' });
                      await load();
                    }}
                  >
                    Refuzo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const start = prompt('Data e kunderofertes nga (YYYY-MM-DD):', req.requested_start_date);
                      const end = prompt('Data e kunderofertes deri (YYYY-MM-DD):', req.requested_end_date);
                      if (!start || !end) return;
                      await leaveRequestApi.adminDecision(req.id, {
                        type: 'counter_offer',
                        counter_start_date: start,
                        counter_end_date: end,
                        admin_comment: 'Ofrohet date alternative',
                      });
                      await load();
                    }}
                  >
                    Ofron date tjeter
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveRequestsPage;
