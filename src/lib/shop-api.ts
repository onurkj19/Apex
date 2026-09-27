import supabase from '@/lib/supabase';

export interface ShopProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  discount_percent: number;
  image_url: string | null;
  in_stock: boolean;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export interface ShopOrderItem {
  product_id: string;
  title: string;
  price: number;
  discount_percent: number;
  quantity: number;
  unit_price: number; // discounted price
}

export interface ShopOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  customer_city: string;
  customer_zip: string;
  items: ShopOrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export const discountedPrice = (price: number, discountPercent: number) =>
  discountPercent > 0 ? price * (1 - discountPercent / 100) : price;

// ─── Products ────────────────────────────────────────────────────────────────

export const shopProductsApi = {
  async list(): Promise<ShopProduct[]> {
    const { data, error } = await supabase
      .from('shop_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ShopProduct[];
  },

  async listPublic(): Promise<ShopProduct[]> {
    const { data, error } = await supabase
      .from('shop_products')
      .select('*')
      .eq('in_stock', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ShopProduct[];
  },

  async updateOrder(items: { id: string; sort_order: number }[]): Promise<void> {
    await Promise.all(
      items.map(({ id, sort_order }) =>
        supabase.from('shop_products').update({ sort_order }).eq('id', id)
      )
    );
  },

  async create(product: Omit<ShopProduct, 'id' | 'created_at'>): Promise<ShopProduct> {
    const { data, error } = await supabase
      .from('shop_products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data as ShopProduct;
  },

  async update(id: string, product: Partial<Omit<ShopProduct, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await supabase
      .from('shop_products')
      .update(product)
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('shop_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('shop-images')
      .upload(filename, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('shop-images').getPublicUrl(filename);
    return data.publicUrl;
  },
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const shopOrdersApi = {
  async create(order: Omit<ShopOrder, 'id' | 'created_at' | 'status'>): Promise<ShopOrder> {
    const { data, error } = await supabase
      .from('shop_orders')
      .insert({ ...order, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return data as ShopOrder;
  },

  async list(): Promise<ShopOrder[]> {
    const { data, error } = await supabase
      .from('shop_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ShopOrder[];
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('shop_orders')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },
};
