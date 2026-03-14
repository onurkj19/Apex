import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { financeApi } from '@/lib/erp-api';
import type { ExpenseCategory, FinanceEntry, PaymentMethod } from '@/lib/erp-types';
import { z } from 'zod';

const categories: ExpenseCategory[] = ['Karburant', 'Pajisje', 'Blerje Produktesh', 'Qira Magazine', 'Mjete Pune'];
const methods: PaymentMethod[] = ['Cash', 'Bank'];
const financeSchema = z.object({
  title: z.string().min(3, 'Titulli duhet te kete te pakten 3 karaktere'),
  amount: z.coerce.number().positive('Shuma duhet te jete me e madhe se 0'),
});

const FinancesPage = () => {
  const [rows, setRows] = useState<FinanceEntry[]>([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    finance_type: 'expense' as 'income' | 'expense',
    category: '' as ExpenseCategory | '',
    payment_method: 'Bank' as PaymentMethod,
  });

  const load = async () => setRows(await financeApi.list());
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = financeSchema.safeParse({ title: form.title, amount: form.amount });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash kete hyrje financiare?')) return;
    setIsSubmitting(true);
    try {
      await financeApi.create({
        title: form.title,
        amount: Number(form.amount),
        finance_type: form.finance_type,
        category: form.finance_type === 'expense' ? (form.category || null) : null,
        payment_method: form.payment_method,
      });
      setForm({ title: '', amount: '', finance_type: 'expense', category: '', payment_method: 'Bank' });
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const cashBalance = rows.reduce((sum, r) => r.payment_method === 'Cash' ? sum + (r.finance_type === 'income' ? r.amount : -r.amount) : sum, 0);
  const bankBalance = rows.reduce((sum, r) => r.payment_method === 'Bank' ? sum + (r.finance_type === 'income' ? r.amount : -r.amount) : sum, 0);

  const saveEdit = async (row: FinanceEntry) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin?')) return;
    setActionLoadingId(`edit-${row.id}`);
    try {
      await financeApi.update(row.id, {
        title: row.title,
        amount: row.amount,
        finance_type: row.finance_type,
        category: row.category,
        payment_method: row.payment_method,
      });
      setEditingId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeRow = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kete transaksion?')) return;
    setActionLoadingId(`delete-${id}`);
    try {
      await financeApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Financat</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Bilanci Cash</CardTitle></CardHeader><CardContent>{cashBalance.toFixed(2)} CHF</CardContent></Card>
        <Card><CardHeader><CardTitle>Bilanci Bank</CardTitle></CardHeader><CardContent>{bankBalance.toFixed(2)} CHF</CardContent></Card>
        <Card><CardHeader><CardTitle>Bilanci total</CardTitle></CardHeader><CardContent>{(cashBalance + bankBalance).toFixed(2)} CHF</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Shto hyrje financiare</CardTitle></CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={onSubmit}>
            <div><Label>Titulli</Label><Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} required /></div>
            <div><Label>Shuma</Label><Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} required /></div>
            <div>
              <Label>Lloji</Label>
              <Select value={form.finance_type} onValueChange={(v) => setForm((s) => ({ ...s, finance_type: v as 'income' | 'expense' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Te ardhura</SelectItem>
                  <SelectItem value="expense">Shpenzim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategoria</Label>
              <Select value={form.category || '__none__'} onValueChange={(v) => setForm((s) => ({ ...s, category: v === '__none__' ? '' : (v as ExpenseCategory) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Pa kategori</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metoda</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm((s) => ({ ...s, payment_method: v as PaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {error && <p className="md:col-span-5 text-sm text-destructive">{error}</p>}
            <div className="md:col-span-5">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Duke ruajtur...' : 'Ruaj hyrjen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historiku i financave</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="border rounded p-3 flex items-center justify-between">
              {editingId === row.id ? (
                <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <Input value={row.title} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, title: e.target.value } : r))} />
                  <Input type="number" value={row.amount} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, amount: Number(e.target.value) } : r))} />
                  <Select value={row.finance_type} onValueChange={(v) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, finance_type: v as 'income' | 'expense' } : r))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Te ardhura</SelectItem>
                      <SelectItem value="expense">Shpenzim</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={row.payment_method} onValueChange={(v) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, payment_method: v as PaymentMethod } : r))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={actionLoadingId === `edit-${row.id}`} onClick={() => saveEdit(row)}>
                      {actionLoadingId === `edit-${row.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-${row.id}`} onClick={() => setEditingId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.finance_type === 'income' ? 'Te ardhura' : `Shpenzim - ${row.category || '-'}`} | {row.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={row.finance_type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {row.finance_type === 'income' ? '+' : '-'} {Number(row.amount).toFixed(2)} CHF
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(row.id)}>Edito</Button>
                    <Button size="sm" variant="destructive" disabled={actionLoadingId === `delete-${row.id}`} onClick={() => removeRow(row.id)}>
                      {actionLoadingId === `delete-${row.id}` ? 'Duke fshire...' : 'Fshi'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka transaksione financiare.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancesPage;
