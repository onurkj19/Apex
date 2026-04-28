import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auditApi } from '@/lib/erp-api';
import type { AuditLogItem } from '@/lib/erp-types';
import { Download, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const opColor: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const AuditLogsPage = () => {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tableName, setTableName] = useState('');
  const [operation, setOperation] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await auditApi.list({
        search: search.trim() || undefined,
        tableName: tableName || undefined,
        operation: operation || undefined,
      });
      setItems(rows);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const tableOptions = useMemo(() =>
    Array.from(new Set(items.map(i => i.table_name))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [items]);

  const exportCsv = () => {
    const header = ['created_at','table_name','operation','record_id','user_id','old_data','new_data'];
    const lines = items.map(row =>
      [row.created_at, row.table_name, row.operation, row.record_id || '', row.user_id || '',
       JSON.stringify(row.old_data || {}), JSON.stringify(row.new_data || {})]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={items.length === 0} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Duke ngarkuar...' : 'Rifresko'}
          </Button>
        </div>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-3 gap-3">
        {(['INSERT','UPDATE','DELETE'] as const).map(op => {
          const count = items.filter(i => i.operation === op).length;
          return (
            <Card key={op} className="cursor-pointer" onClick={() => setOperation(prev => prev === op ? '' : op)}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block', opColor[op])}>{op}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtrat */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>Kërko dhe filtro</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Kërko table, id, payload..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <Select value={tableName || '__all__'} onValueChange={v => setTableName(v === '__all__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Të gjitha tabelat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Të gjitha tabelat</SelectItem>
              {tableOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={operation || '__all__'} onValueChange={v => setOperation(v === '__all__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Të gjitha operacionet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Të gjitha operacionet</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:col-span-3">
            <Button onClick={load} disabled={loading}>Apliko filtrat</Button>
          </div>
        </CardContent>
      </Card>

      {/* Historia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Historia — {items.length} regjistrime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar audit logs...</p>}
          {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka regjistrime audit.</p>}
          {!loading && items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-border/70 overflow-hidden">
                <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', opColor[item.operation] || 'bg-muted text-muted-foreground')}>{item.operation}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.table_name} {item.record_id ? `· ${item.record_id.slice(0,8)}…` : ''}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('sq-AL')} · {item.user_id ? item.user_id.slice(0,12)+'…' : 'Sistemi'}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-2">
                    <p className="text-xs text-muted-foreground font-mono break-all">ID: {item.record_id || '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">Përdoruesi: {item.user_id || 'Sistemi'}</p>
                    {item.old_data && Object.keys(item.old_data).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Para:</p>
                        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(item.old_data, null, 2)}</pre>
                      </div>
                    )}
                    {item.new_data && Object.keys(item.new_data).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Pas:</p>
                        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(item.new_data, null, 2)}</pre>
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

export default AuditLogsPage;
