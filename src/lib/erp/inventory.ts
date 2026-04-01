import supabase from '@/lib/supabase';
import type { InventoryItem } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export const inventoryApi = {
  async list(): Promise<InventoryItem[]> {
    const { data, error } = await supabase.from('inventory').select('*').order('category');
    if (error) throw error;
    return (data || []) as InventoryItem[];
  },
  async addStock(payload: { category: InventoryItem['category']; item_name: string; quantity: number }) {
    const itemName = payload.item_name.trim();
    if (!itemName) throw new Error('Item name is required');
    if (payload.quantity <= 0) throw new Error('Quantity must be greater than zero');

    const { data: existingRows, error: findError } = await supabase
      .from('inventory')
      .select('id, total_quantity, used_quantity')
      .eq('category', payload.category)
      .eq('item_name', itemName)
      .limit(1);
    if (findError) throw findError;

    const existing = (existingRows || [])[0];
    if (existing) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ total_quantity: Number(existing.total_quantity || 0) + payload.quantity })
        .eq('id', existing.id);
      if (updateError) throw updateError;
      await createAdminChangeNotification(
        'Inventari u perditesua',
        `U shtua +${payload.quantity} te "${itemName}"`,
        { category: payload.category, item_name: itemName, quantity: payload.quantity }
      );
      return;
    }

    const { error: insertError } = await supabase.from('inventory').insert({
      category: payload.category,
      item_name: itemName,
      total_quantity: payload.quantity,
      used_quantity: 0,
    });
    if (insertError) throw insertError;
    await createAdminChangeNotification(
      'Artikull i ri ne inventar',
      `"${itemName}" u shtua me sasi ${payload.quantity}`,
      { category: payload.category, item_name: itemName, quantity: payload.quantity }
    );
  },
  async upsert(payload: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
    await createAdminChangeNotification('Inventari u perditesua', 'Ndryshim/upsert ne inventar u krye', { changes: payload });
  },
  async update(id: string, payload: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Inventari u editua', `Artikulli ${id} u perditesua`, { inventory_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Artikulli i inventarit u fshi', `Artikulli ${id} u fshi`, { inventory_id: id });
  },
};
