import supabase from '@/lib/supabase';
import { createAdminChangeNotification, tryCreateNotification } from '@/lib/erp/notifications';

export const clientApi = {
  async list() {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload: { company_name: string; client_address: string; phone?: string; email?: string }) {
    const clientPayload = {
      company_name: payload.company_name,
      client_address: payload.client_address,
      phone: payload.phone,
      email: payload.email,
    };

    const { data, error } = await supabase.from('clients').insert(clientPayload).select('id, company_name, client_address').single();
    if (error) throw error;

    await tryCreateNotification({
      type: 'client_created',
      title: 'Klient i ri u shtua',
      message: `${data.company_name} - Adresa: ${data.client_address || 'Pa adrese'}`,
      metadata: {
        client_id: data.id,
        company_name: payload.company_name,
        client_address: payload.client_address,
        phone: payload.phone,
        email: payload.email,
      },
    });
  },
  async update(id: string, payload: { company_name: string; client_address: string; phone?: string; email?: string }) {
    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Klienti u editua', `${payload.company_name} u perditesua`, { client_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Klienti u fshi', `Klienti me ID ${id} u fshi`, { client_id: id });
  },
};

export const equipmentApi = {
  async list() {
    const { data, error } = await supabase.from('equipment').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload: { equipment_name: string; equipment_type: string; status?: string; current_project_id?: string | null; notes?: string }) {
    const { error } = await supabase.from('equipment').insert(payload);
    if (error) throw error;
    await createAdminChangeNotification('Pajisje e re u shtua', `${payload.equipment_name} u shtua`, { equipment: payload });
  },
  async update(id: string, payload: { equipment_name: string; equipment_type: string; status?: string; notes?: string }) {
    const { error } = await supabase.from('equipment').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Pajisja u editua', `${payload.equipment_name || `Pajisja ${id}`} u perditesua`, { equipment_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Pajisja u fshi', `Pajisja me ID ${id} u fshi`, { equipment_id: id });
  },
};
