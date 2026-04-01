import supabase from '@/lib/supabase';
import type { TeamPlanItem } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';
import { getCurrentUser } from '@/lib/erp/session';

export const teamPlanApi = {
  async list(): Promise<TeamPlanItem[]> {
    const { data, error } = await supabase.from('team_plans').select('*').order('plan_date', { ascending: true });
    if (error) throw error;
    return (data || []) as TeamPlanItem[];
  },
  async create(payload: Partial<TeamPlanItem>) {
    const { error } = await supabase.from('team_plans').insert(payload);
    if (error) throw error;
    await createAdminChangeNotification('Plan i ekipit u shtua', `${payload.title || 'Plan'} u krijua`, { team_plan: payload });
  },
  async update(id: string, payload: Partial<TeamPlanItem>) {
    const { error } = await supabase.from('team_plans').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Plan i ekipit u perditesua', `${payload.title || `Plan ${id}`} u perditesua`, { team_plan_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('team_plans').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Plan i ekipit u fshi', `Plani ${id} u fshi`, { team_plan_id: id });
  },
};

export const workerPortalApi = {
  async getAssignedPlans(): Promise<TeamPlanItem[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('worker_id')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.worker_id) return [];

    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 14);
    const to = new Date(today);
    to.setDate(today.getDate() + 60);

    const { data, error } = await supabase
      .from('team_plans')
      .select('*')
      .contains('worker_ids', [profile.worker_id])
      .gte('plan_date', from.toISOString().slice(0, 10))
      .lte('plan_date', to.toISOString().slice(0, 10))
      .order('plan_date', { ascending: true });
    if (error) throw error;
    return (data || []) as TeamPlanItem[];
  },
};
