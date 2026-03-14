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
    await inventoryApi.upsert({
      category: form.category,
      item_name: form.item_name,
      total_quantity: Number(form.total_quantity),
      used_quantity: Number(form.used_quantity),
    });
    setForm({ category: 'Frames', item_name: '', total_quantity: '', used_quantity: '' });
    await load();
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
            <div className="md:col-span-4"><Button type="submit">Ruaj</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Gjendja aktuale</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border rounded-md p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.item_name} ({item.category})</p>
                <p className="text-sm text-muted-foreground">Totali: {item.total_quantity} - Ne pune: {item.used_quantity}</p>
              </div>
              <span className="font-semibold">Disponueshme: {item.available_quantity}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;
