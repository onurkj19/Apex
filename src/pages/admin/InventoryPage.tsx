import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inventoryApi } from '@/lib/erp-api';
import type { InventoryItem } from '@/lib/erp-types';

const categories: InventoryItem['category'][] = ['Frames', 'Platforms', 'Guardrails', 'Anchors', 'Tools'];

const InventoryPage = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'Frames' as InventoryItem['category'],
    item_name: '',
    total_quantity: '',
    used_quantity: '',
  });

  const load = async () => setItems(await inventoryApi.list());
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirm('A je i sigurt qe do ta ruash kete artikull inventari?')) return;
    setIsSubmitting(true);
    try {
      await inventoryApi.upsert({
        category: form.category,
        item_name: form.item_name,
        total_quantity: Number(form.total_quantity),
        used_quantity: Number(form.used_quantity),
      });
      setForm({ category: 'Frames', item_name: '', total_quantity: '', used_quantity: '' });
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEdit = async (item: InventoryItem) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin?')) return;
    setActionLoadingId(`edit-${item.id}`);
    try {
      await inventoryApi.update(item.id, {
        category: item.category,
        item_name: item.item_name,
        total_quantity: item.total_quantity,
        used_quantity: item.used_quantity,
      });
      setEditingId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kete artikull inventari?')) return;
    setActionLoadingId(`delete-${id}`);
    try {
      await inventoryApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventari dhe pajisjet</h2>
      <Card>
        <CardHeader><CardTitle>Shto element inventari</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Kategoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((s) => ({ ...s, category: v as InventoryItem['category'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Emri</Label><Input value={form.item_name} onChange={(e) => setForm((s) => ({ ...s, item_name: e.target.value }))} required /></div>
            <div><Label>Sasia totale</Label><Input type="number" value={form.total_quantity} onChange={(e) => setForm((s) => ({ ...s, total_quantity: e.target.value }))} required /></div>
            <div><Label>Sasia ne perdorim</Label><Input type="number" value={form.used_quantity} onChange={(e) => setForm((s) => ({ ...s, used_quantity: e.target.value }))} required /></div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Gjendja aktuale</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border rounded-md p-3 flex items-center justify-between">
              {editingId === item.id ? (
                <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <Select value={item.category} onValueChange={(v) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, category: v as InventoryItem['category'] } : x))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={item.item_name} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, item_name: e.target.value } : x))} />
                  <Input type="number" value={item.total_quantity} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, total_quantity: Number(e.target.value) } : x))} />
                  <Input type="number" value={item.used_quantity} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, used_quantity: Number(e.target.value) } : x))} />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={actionLoadingId === `edit-${item.id}`} onClick={() => saveEdit(item)}>
                      {actionLoadingId === `edit-${item.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-${item.id}`} onClick={() => setEditingId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{item.item_name} ({item.category})</p>
                    <p className="text-sm text-muted-foreground">Totali: {item.total_quantity} - Ne pune: {item.used_quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Disponueshme: {item.available_quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(item.id)}>Edito</Button>
                    <Button size="sm" variant="destructive" disabled={actionLoadingId === `delete-${item.id}`} onClick={() => removeItem(item.id)}>
                      {actionLoadingId === `delete-${item.id}` ? 'Duke fshire...' : 'Fshi'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;
