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
  const [form, setForm] = useState({
    title: '',
    amount: '',
    finance_type: 'expense' as 'income' | 'expense',
    category: categories[0] as ExpenseCategory,
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
    await financeApi.create({
      title: form.title,
      amount: Number(form.amount),
      finance_type: form.finance_type,
      category: form.finance_type === 'expense' ? form.category : null,
      payment_method: form.payment_method,
    });
    setForm({ title: '', amount: '', finance_type: 'expense', category: categories[0], payment_method: 'Bank' });
    await load();
  };

  const cashBalance = rows.reduce((sum, r) => r.payment_method === 'Cash' ? sum + (r.finance_type === 'income' ? r.amount : -r.amount) : sum, 0);
  const bankBalance = rows.reduce((sum, r) => r.payment_method === 'Bank' ? sum + (r.finance_type === 'income' ? r.amount : -r.amount) : sum, 0);

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
              <Select value={form.category} onValueChange={(v) => setForm((s) => ({ ...s, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
            <div className="md:col-span-5"><Button type="submit">Ruaj hyrjen</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historiku i financave</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.finance_type === 'income' ? 'Te ardhura' : `Shpenzim - ${row.category || '-'}`} | {row.payment_method}
                </p>
              </div>
              <p className={row.finance_type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {row.finance_type === 'income' ? '+' : '-'} {Number(row.amount).toFixed(2)} CHF
              </p>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka transaksione financiare.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancesPage;
