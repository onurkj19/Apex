import { documentUrl } from '@/lib/private-documents';
import supabase from '@/lib/supabase';
import type { Contract } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export const contractApi = {
  async list(): Promise<Contract[]> {
    const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all(((data || []) as Contract[]).map(async row => ({ ...row, contract_file_url: await documentUrl(row.contract_file_path, row.contract_file_url) })));
  },
  async uploadPdf(file: File) {
    const path = `contracts/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('erp-documents').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    return { path, url: await documentUrl(path) };
  },
  async create(payload: Partial<Contract>) {
    const { error } = await supabase.from('contracts').insert(payload);
    if (error) throw error;
    await createAdminChangeNotification(
      'Kontrate e re u shtua',
      `${payload.contract_title || 'Kontrate'} u regjistrua`,
      { contract: payload }
    );
  },
  async update(id: string, payload: Partial<Contract>) {
    const { error } = await supabase.from('contracts').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification(
      'Kontrata u editua',
      `${payload.contract_title || `Kontrata ${id}`} u perditesua`,
      { contract_id: id, changes: payload }
    );
  },
  async remove(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Kontrata u fshi', `Kontrata me ID ${id} u fshi`, { contract_id: id });
  },
};
