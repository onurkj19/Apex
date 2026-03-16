import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { financeApi } from '@/lib/erp-api';
import type { ExpenseCategory, FinanceEntry, PaymentMethod } from '@/lib/erp-types';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState({
    title: '',
    amount: '',
    payment_method: 'Bank' as PaymentMethod,
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: '' as ExpenseCategory | '',
    payment_method: 'Bank' as PaymentMethod,
  });

  const load = async () => setRows(await financeApi.list());
  useEffect(() => { load(); }, []);

  const onIncomeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = financeSchema.safeParse({ title: incomeForm.title, amount: incomeForm.amount });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash kete hyrje?')) return;
    setIsSubmittingIncome(true);
    try {
      await financeApi.create({
        title: incomeForm.title,
        amount: Number(incomeForm.amount),
        finance_type: 'income',
        category: null,
        payment_method: incomeForm.payment_method,
      });
      setIncomeForm({ title: '', amount: '', payment_method: 'Bank' });
      await load();
    } finally {
      setIsSubmittingIncome(false);
    }
  };

  const onExpenseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = financeSchema.safeParse({ title: expenseForm.title, amount: expenseForm.amount });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme');
      return;
    }
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
      setExpenseForm({ title: '', amount: '', category: '', payment_method: 'Bank' });
      await load();
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const cashBalance = rows.reduce((sum, r) => r.payment_method === 'Cash' ? sum + (r.finance_type === 'income' ? r.amount : -r.amount) : sum, 0);
  const bankBalance = rows.reduce((sum, r) => r.payment_method === 'Bank' ? sum + (r.finance_type === 'income' ? r.amount : -r.amount) : sum, 0);
  const incomeRows = rows.filter((r) => r.finance_type === 'income');
  const expenseRows = rows.filter((r) => r.finance_type === 'expense');

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
    } catch (error: any) {
      alert(error?.message || 'Nuk u arrit fshirja e transaksionit.');
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <ArrowDownCircle className="h-5 w-5" />
              Hyrje (Te ardhura)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-3" onSubmit={onIncomeSubmit}>
              <div><Label>Titulli</Label><Input value={incomeForm.title} onChange={(e) => setIncomeForm((s) => ({ ...s, title: e.target.value }))} required /></div>
              <div><Label>Shuma</Label><Input type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm((s) => ({ ...s, amount: e.target.value }))} required /></div>
              <div>
                <Label>Metoda</Label>
                <Select value={incomeForm.payment_method} onValueChange={(v) => setIncomeForm((s) => ({ ...s, payment_method: v as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div>
                <Button type="submit" disabled={isSubmittingIncome} className="bg-green-600 hover:bg-green-700">
                  {isSubmittingIncome ? 'Duke ruajtur...' : 'Ruaj hyrjen'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ArrowUpCircle className="h-5 w-5" />
              Shpenzime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-3" onSubmit={onExpenseSubmit}>
              <div><Label>Titulli</Label><Input value={expenseForm.title} onChange={(e) => setExpenseForm((s) => ({ ...s, title: e.target.value }))} required /></div>
              <div><Label>Shuma</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((s) => ({ ...s, amount: e.target.value }))} required /></div>
              <div>
                <Label>Kategoria</Label>
                <Select value={expenseForm.category || '__none__'} onValueChange={(v) => setExpenseForm((s) => ({ ...s, category: v === '__none__' ? '' : (v as ExpenseCategory) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Pa kategori</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Metoda</Label>
                <Select value={expenseForm.payment_method} onValueChange={(v) => setExpenseForm((s) => ({ ...s, payment_method: v as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div>
                <Button type="submit" disabled={isSubmittingExpense} variant="destructive">
                  {isSubmittingExpense ? 'Duke ruajtur...' : 'Ruaj shpenzimin'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Historiku i Hyrjeve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomeRows.map((row) => (
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
                      <p className="text-xs text-muted-foreground">Te ardhura | {row.payment_method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-green-600 font-semibold">+ {Number(row.amount).toFixed(2)} CHF</p>
                      <RowActionsMenu
                        disabled={actionLoadingId === `delete-${row.id}`}
                        actions={[
                          { label: 'Edito', onClick: () => setEditingId(row.id) },
                          {
                            label: actionLoadingId === `delete-${row.id}` ? 'Duke fshire...' : 'Fshi',
                            onClick: () => removeRow(row.id),
                            disabled: actionLoadingId === `delete-${row.id}`,
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            {incomeRows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka hyrje financiare.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Historiku i Shpenzimeve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenseRows.map((row) => (
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
                      <p className="text-xs text-muted-foreground">Shpenzim - {row.category || '-'} | {row.payment_method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-red-600 font-semibold">- {Number(row.amount).toFixed(2)} CHF</p>
                      <RowActionsMenu
                        disabled={actionLoadingId === `delete-${row.id}`}
                        actions={[
                          { label: 'Edito', onClick: () => setEditingId(row.id) },
                          {
                            label: actionLoadingId === `delete-${row.id}` ? 'Duke fshire...' : 'Fshi',
                            onClick: () => removeRow(row.id),
                            disabled: actionLoadingId === `delete-${row.id}`,
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            {expenseRows.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka shpenzime.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancesPage;
