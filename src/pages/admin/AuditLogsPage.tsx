import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auditApi } from '@/lib/erp-api';
import type { AuditLogItem } from '@/lib/erp-types';

const AuditLogsPage = () => {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tableName, setTableName] = useState('');
  const [operation, setOperation] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await auditApi.list({
        search: search.trim() || undefined,
        tableName: tableName.trim() || undefined,
        operation: operation.trim().toUpperCase() || undefined,
      });
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const tableOptions = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.table_name)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const exportCsv = () => {
    const header = ['created_at', 'table_name', 'operation', 'record_id', 'user_id', 'old_data', 'new_data'];
    const lines = items.map((row) =>
      [
        row.created_at,
        row.table_name,
        row.operation,
        row.record_id || '',
        row.user_id || '',
        JSON.stringify(row.old_data || {}),
        JSON.stringify(row.new_data || {}),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const content = [header.join(','), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={items.length === 0}>
            Export CSV
          </Button>
          <Button onClick={load} disabled={loading}>
            {loading ? 'Duke ngarkuar...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kerko dhe filtro</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Kerko table, id, payload..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
          >
            <option value="">Te gjitha tabelat</option>
            {tableOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
          >
            <option value="">Te gjitha operacionet</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <div className="md:col-span-3">
            <Button onClick={load} disabled={loading}>
              Apliko filtra
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historia (kush - cka - kur)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar audit logs...</p>}
          {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka regjistrime audit.</p>}
          {!loading &&
            items.map((item) => (
              <div key={item.id} className="border rounded-md p-3 space-y-1">
                <p className="font-medium">
                  [{item.operation}] {item.table_name} - ID: {item.record_id || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Koha: {new Date(item.created_at).toLocaleString('sq-AL')}</p>
                <p className="text-xs text-muted-foreground">Perdoruesi: {item.user_id || 'Sistemi'}</p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
