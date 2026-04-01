import supabase from '@/lib/supabase';
import type { Worker, WorkerGroup } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export const workerApi = {
  async list(): Promise<Worker[]> {
    const { data, error } = await supabase.from('workers').select('*').order('full_name', { ascending: true });
    if (error) throw error;
    return (data || []) as Worker[];
  },
  async create(payload: Partial<Worker>) {
    const { error } = await supabase.from('workers').insert(payload);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetor i ri u shtua',
      `${payload.full_name || 'Punetor'} u shtua me sukses`,
      { worker: payload }
    );
  },
  async update(workerId: string, payload: Partial<Worker>) {
    const { error } = await supabase.from('workers').update(payload).eq('id', workerId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetori u editua',
      `${payload.full_name || `Punetori ${workerId}`} u perditesua`,
      { worker_id: workerId, changes: payload }
    );
  },
  async remove(workerId: string) {
    const { error } = await supabase.from('workers').delete().eq('id', workerId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetori u fshi',
      `Punetori me ID ${workerId} u fshi`,
      { worker_id: workerId }
    );
  },
  async moveGroup(workerId: string, groupName: string) {
    const { error } = await supabase.from('workers').update({ group_name: groupName }).eq('id', workerId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetori ndryshoi grup',
      `Punetori ${workerId} u kalua ne grupin ${groupName}`,
      { worker_id: workerId, group_name: groupName }
    );
  },
};

export const workerGroupApi = {
  async list(activeOnly = false): Promise<WorkerGroup[]> {
    let query = supabase.from('worker_groups').select('*').order('name');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as WorkerGroup[];
  },
  async create(name: string) {
    const { error } = await supabase.from('worker_groups').insert({ name, is_active: true });
    if (error) throw error;
    await createAdminChangeNotification('Grup i ri u shtua', `Grupi "${name}" u krijua`, { group_name: name });
  },
  async setActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('worker_groups').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification(
      'Statusi i grupit u ndryshua',
      `Grupi ${id} u ${isActive ? 'aktivizua' : 'caktivizua'}`,
      { group_id: id, is_active: isActive }
    );
  },
  async remove(id: string) {
    const { error } = await supabase.from('worker_groups').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Grupi u fshi', `Grupi me ID ${id} u fshi`, { group_id: id });
  },
};
