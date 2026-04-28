import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { financeApi, projectApi } from '@/lib/erp-api';
import type { ExpenseCategory, FinanceEntry, PaymentMethod } from '@/lib/erp-types';
import { ArrowDownCircle, ArrowUpCircle, Plus, TrendingUp, TrendingDown, Landmark, Banknote, ChevronDown } from 'lucide-react';
import { z } from 'zod';
import { cn, formatChf } from '@/lib/utils';

const categories: ExpenseCategory[] = ['Karburant', 'Pajisje', 'Blerje Produktesh', 'Qira Magazine', 'Mjete Pune'];
const methods: PaymentMethod[] = ['Cash', 'Bank'];
const financeSchema = z.object({
  title: z.string().min(3, 'Titulli duhet te kete te pakten 3 karaktere'),
  amount: z.coerce.number().positive('Shuma duhet te jete me e madhe se 0'),
});

type ActiveForm = 'income' | 'expense' | null;

const categoryColor: Record<string, string> = {
  'Karburant': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Pajisje': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Blerje Produktesh': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Qira Magazine': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Mjete Pune': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const FinancesPage = () => {
  const [rows, setRows] = useState<FinanceEntry[]>([]);
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; project_name: string }>>([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [incomeForm, setIncomeForm] = useState({
    title: '',
    amount: '',
    payment_method: 'Bank' as PaymentMethod,
    project_id: '' as string,
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: '' as ExpenseCategory | '',
    payment_method: 'Cash' as PaymentMethod,
  });

  const projectNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projectOptions) m[p.id] = p.project_name;
    return m;
  }, [projectOptions]);

  const load = async () => {
    const [financeRows, projectRows] = await Promise.all([financeApi.list(), projectApi.list()]);
    setRows(financeRows);
    setProjectOptions(projectRows.map((p) => ({ id: p.id, project_name: p.project_name })));
  };
  useEffect(() => { load(); }, []);

  const onIncomeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = financeSchema.safeParse({ title: incomeForm.title, amount: incomeForm.amount });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme'); return; }
    if (!confirm('A je i sigurt qe do ta ruash kete hyrje?')) return;
    setIsSubmittingIncome(true);
    try {
      await financeApi.create({
        title: incomeForm.title,
        amount: Number(incomeForm.amount),
        finance_type: 'income',
        category: null,
        payment_method: incomeForm.payment_method,
        project_id: incomeForm.project_id || null,
      });
      setIncomeForm({ title: '', amount: '', payment_method: 'Bank', project_id: '' });
      setActiveForm(null);
      await load();
    } finally { setIsSubmittingIncome(false); }
  };

  const onExpenseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = financeSchema.safeParse({ title: expenseForm.title, amount: expenseForm.amount });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme'); return; }
    if (!confirm('A je i sigurt qe do ta ruash kete shpenzim?')) return;
    setIsSubmittingExpense(true);
    try {
      await financeApi.create({
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        finance_type: 'expense',
        category: expenseForm.category || null,
        payment_method: expenseForm.payment_method,
      });
      setExpenseForm({ title: '', amount: '', category: '', payment_method: 'Cash' });
      setActiveForm(null);
      await load();
    } finally { setIsSubmittingExpense(false); }
  };

  const cashBalance = rows.reduce((s, r) => r.payment_method === 'Cash' ? s + (r.finance_type === 'income' ? r.amount : -r.amount) : s, 0);
  const bankBalance = rows.reduce((s, r) => r.payment_method === 'Bank' ? s + (r.finance_type === 'income' ? r.amount : -r.amount) : s, 0);
  const totalIncome = rows.filter((r) => r.finance_type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = rows.filter((r) => r.finance_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);

  const saveEdit = async (row: FinanceEntry) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin?')) return;
    setActionLoadingId(`edit-${row.id}`);
    try {
      await financeApi.update(row.id, {
        title: row.title,
        amount: row.amount,
        finance_type: row.finance_type,
        category: row.finance_type === 'expense' ? row.category : null,
        payment_method: row.payment_method,
        project_id: row.finance_type === 'income' ? row.project_id ?? null : null,
      });
      setEditingId(null);
      setExpandedId(row.id);
      await load();
    } finally { setActionLoadingId(null); }
  };

  const removeRow = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kete transaksion?')) return;
    setActionLoadingId(`delete-${id}`);
    try {
      await financeApi.remove(id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Nuk u arrit fshirja.');
    } finally { setActionLoadingId(null); }
  };

  const filteredRows = useMemo(() =>
    rows.filter((r) => historyFilter === 'all' ? true : r.finance_type === historyFilter),
    [rows, historyFilter]
  );

  // Group by month
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, FinanceEntry[]>();
    for (const r of filteredRows) {
      const key = r.finance_date ? r.finance_date.slice(0, 7) : 'Pa datë';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRows]);

  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const toggleMonth = (key: string) =>
    setOpenMonths((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const formatMonth = (key: string) => {
    if (key === 'Pa datë') return key;
    const [y, m] = key.split('-');
    const months = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Financat</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeForm === 'income' ? 'default' : 'outline'}
            className={cn('gap-2', activeForm === 'income' && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600')}
            onClick={() => setActiveForm((v) => v === 'income' ? null : 'income')}
          >
            <ArrowDownCircle className="h-4 w-4" />
            Shto Hyrje
          </Button>
          <Button
            type="button"
            variant={activeForm === 'expense' ? 'default' : 'outline'}
            className={cn('gap-2', activeForm === 'expense' && 'bg-red-600 hover:bg-red-700 text-white border-red-600')}
            onClick={() => setActiveForm((v) => v === 'expense' ? null : 'expense')}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Shto Shpenzim
          </Button>
        </div>
      </div>

      {/* Bilanci - 4 karta */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Hyrje Totale</span>
            </div>
            <p className="text-xl font-bold tabular-nums text-emerald-600">+ {formatChf(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Shpenzime Totale</span>
            </div>
            <p className="text-xl font-bold tabular-nums text-red-500">- {formatChf(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bilanci Bank</span>
            </div>
            <p className={cn('text-xl font-bold tabular-nums', bankBalance >= 0 ? 'text-blue-600' : 'text-red-500')}>
              {formatChf(bankBalance)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bilanci Cash</span>
            </div>
            <p className={cn('text-xl font-bold tabular-nums', cashBalance >= 0 ? 'text-amber-600' : 'text-red-500')}>
              {formatChf(cashBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulari i Hyrjes */}
      {activeForm === 'income' && (
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <ArrowDownCircle className="h-5 w-5" />
              Hyrje e re (Të ardhura)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onIncomeSubmit}>
              <div className="space-y-1.5">
                <Label>Titulli</Label>
                <Input value={incomeForm.title} onChange={(e) => setIncomeForm((s) => ({ ...s, title: e.target.value }))} placeholder="p.sh. Pagesë nga klienti" required />
              </div>
              <div className="space-y-1.5">
                <Label>Shuma (CHF)</Label>
                <Input type="number" step="0.01" value={incomeForm.amount} onChange={(e) => setIncomeForm((s) => ({ ...s, amount: e.target.value }))} placeholder="p.sh. 2500" required />
              </div>
              <div className="space-y-1.5">
                <Label>Projekt (opsional)</Label>
                <Select value={incomeForm.project_id || '__none__'} onValueChange={(v) => setIncomeForm((s) => ({ ...s, project_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Pa projekt" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Pa lidhje projekti</SelectItem>
                    {projectOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Metoda e pagesës</Label>
                <Select value={incomeForm.payment_method} onValueChange={(v) => setIncomeForm((s) => ({ ...s, payment_method: v as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isSubmittingIncome} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <Plus className="h-4 w-4" />
                  {isSubmittingIncome ? 'Duke ruajtur...' : 'Ruaj hyrjen'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setActiveForm(null); setError(''); }}>Anulo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulari i Shpenzimit */}
      {activeForm === 'expense' && (
        <Card className="border-red-300 dark:border-red-700">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <ArrowUpCircle className="h-5 w-5" />
              Shpenzim i ri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onExpenseSubmit}>
              <div className="space-y-1.5">
                <Label>Titulli</Label>
                <Input value={expenseForm.title} onChange={(e) => setExpenseForm((s) => ({ ...s, title: e.target.value }))} placeholder="p.sh. Karburant Tetor" required />
              </div>
              <div className="space-y-1.5">
                <Label>Shuma (CHF)</Label>
                <Input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((s) => ({ ...s, amount: e.target.value }))} placeholder="p.sh. 350" required />
              </div>
              <div className="space-y-1.5">
                <Label>Kategoria</Label>
                <Select value={expenseForm.category || '__none__'} onValueChange={(v) => setExpenseForm((s) => ({ ...s, category: v === '__none__' ? '' : (v as ExpenseCategory) }))}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh kategorinë" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Pa kategori</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Metoda e pagesës</Label>
                <Select value={expenseForm.payment_method} onValueChange={(v) => setExpenseForm((s) => ({ ...s, payment_method: v as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isSubmittingExpense} className="bg-red-600 hover:bg-red-700 gap-2">
                  <Plus className="h-4 w-4" />
                  {isSubmittingExpense ? 'Duke ruajtur...' : 'Ruaj shpenzimin'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setActiveForm(null); setError(''); }}>Anulo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historiku */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Historiku i transaksioneve</CardTitle>
            <div className="flex gap-1.5">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setHistoryFilter(f)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                    historyFilter === f
                      ? f === 'income' ? 'bg-emerald-600 text-white border-emerald-600'
                        : f === 'expense' ? 'bg-red-600 text-white border-red-600'
                        : 'bg-foreground text-background border-foreground'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {f === 'all' ? 'Të gjitha' : f === 'income' ? 'Hyrje' : 'Shpenzime'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {groupedByMonth.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nuk ka transaksione.</p>
          )}
          {groupedByMonth.map(([monthKey, monthRows]) => {
            const isOpen = openMonths.has(monthKey);
            const monthIncome = monthRows.filter((r) => r.finance_type === 'income').reduce((s, r) => s + Number(r.amount), 0);
            const monthExpense = monthRows.filter((r) => r.finance_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
            return (
              <div key={monthKey} className="rounded-xl border border-border/70 overflow-hidden">
                {/* Header muaji */}
                <button
                  type="button"
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
                    <span className="font-semibold">{formatMonth(monthKey)}</span>
                    <span className="text-xs text-muted-foreground">({monthRows.length} transaksione)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {monthIncome > 0 && <span className="text-emerald-600 font-medium tabular-nums">+ {formatChf(monthIncome)}</span>}
                    {monthExpense > 0 && <span className="text-red-500 font-medium tabular-nums">- {formatChf(monthExpense)}</span>}
                    <span className={cn('font-semibold tabular-nums', (monthIncome - monthExpense) >= 0 ? 'text-foreground' : 'text-red-500')}>
                      = {formatChf(monthIncome - monthExpense)}
                    </span>
                  </div>
                </button>

                {/* Rreshtat */}
                {isOpen && (
                  <div className="divide-y divide-border/50">
                    {monthRows.map((row) => {
                      const isExp = row.finance_type === 'expense';
                      const isEditing = editingId === row.id;
                      const isExpanded = expandedId === row.id;
                      return (
                        <div key={row.id} className="bg-card">
                          {/* Rreshti kryesor — gjithmonë i dukshëm */}
                          <button
                            type="button"
                            className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                            onClick={() => {
                              if (isEditing) return;
                              setExpandedId((prev) => prev === row.id ? null : row.id);
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', isExp ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30')}>
                                {isExp
                                  ? <ArrowUpCircle className="h-4 w-4 text-red-500" />
                                  : <ArrowDownCircle className="h-4 w-4 text-emerald-600" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm leading-snug truncate">{row.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {row.finance_date} · {row.payment_method}
                                  {row.category && ` · ${row.category}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {row.category && (
                                <span className={cn('hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', categoryColor[row.category] || 'bg-muted text-muted-foreground')}>
                                  {row.category}
                                </span>
                              )}
                              <span className={cn('tabular-nums font-bold text-sm', isExp ? 'text-red-500' : 'text-emerald-600')}>
                                {isExp ? '- ' : '+ '}{formatChf(Number(row.amount))}
                              </span>
                              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', (isExpanded || isEditing) && 'rotate-180')} />
                            </div>
                          </button>

                          {/* Panel i zgjeruar */}
                          {(isExpanded || isEditing) && (
                            <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-3">
                              {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Titulli</Label>
                                    <Input value={row.title} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, title: e.target.value } : r))} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Shuma (CHF)</Label>
                                    <Input type="number" step="0.01" value={row.amount} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, amount: Number(e.target.value) } : r))} />
                                  </div>
                                  {isExp && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Kategoria</Label>
                                      <Select value={row.category || '__none__'} onValueChange={(v) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, category: v === '__none__' ? null : v as ExpenseCategory } : r))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">Pa kategori</SelectItem>
                                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                  {!isExp && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Projekti</Label>
                                      <Select value={row.project_id || '__none__'} onValueChange={(v) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, project_id: v === '__none__' ? null : v } : r))}>
                                        <SelectTrigger><SelectValue placeholder="Pa projekt" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">Pa projekt</SelectItem>
                                          {projectOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <Label className="text-xs">Metoda</Label>
                                    <Select value={row.payment_method} onValueChange={(v) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, payment_method: v as PaymentMethod } : r))}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="md:col-span-2 flex gap-2">
                                    <Button size="sm" disabled={actionLoadingId === `edit-${row.id}`} onClick={() => saveEdit(row)}>
                                      {actionLoadingId === `edit-${row.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setExpandedId(row.id); }}>Anulo</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2 text-sm">
                                    <span className="text-muted-foreground">Data:</span>
                                    <span>{row.finance_date || '—'}</span>
                                    {row.project_id && (
                                      <>
                                        <span className="text-muted-foreground">· Projekt:</span>
                                        <span className="text-primary">{projectNameById[row.project_id] || row.project_id}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <Button size="sm" variant="outline" onClick={() => setEditingId(row.id)}>Modifiko</Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      disabled={actionLoadingId === `delete-${row.id}`}
                                      onClick={() => removeRow(row.id)}
                                    >
                                      {actionLoadingId === `delete-${row.id}` ? 'Duke fshirë...' : 'Fshi'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

export default FinancesPage;
