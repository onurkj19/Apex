import supabase from '@/lib/supabase';
import type { TeamPlanAttachment, TeamPlanItem } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';
import { getCurrentUser } from '@/lib/erp/session';

function safeStorageFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
}

export const teamPlanApi = {
  async list(): Promise<TeamPlanItem[]> {
    const { data, error } = await supabase.from('team_plans').select('*').order('plan_date', { ascending: true });
    if (error) throw error;
    return normalizePlans(data || []);
  },
  /** Ngarkon foto/PDF në bucket (vetëm admin me RLS). */
  async uploadAttachment(planId: string, file: File, title: string): Promise<TeamPlanAttachment> {
    const stamp = Date.now();
    const path = `team-plans/${planId}/${stamp}_${safeStorageFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('erp-documents').upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from('erp-documents').getPublicUrl(path);
    return {
      title: title.trim() || file.name,
      url: pub.publicUrl,
      path,
      mime: file.type || undefined,
    };
  },
  async create(payload: Partial<TeamPlanItem>): Promise<TeamPlanItem> {
    const { attachments: _omit, ...rest } = payload;
    const { data, error } = await supabase.from('team_plans').insert({ ...rest, attachments: [] }).select('*').single();
    if (error) throw error;
    const row = normalizePlan(data as TeamPlanItem);
    await createAdminChangeNotification('Plan i ekipit u shtua', `${row.title || 'Plan'} u krijua`, { team_plan_id: row.id });
    return row;
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
    return normalizePlans(data || []);
  },
};

function normalizePlan(p: TeamPlanItem): TeamPlanItem {
  const raw = p.attachments as unknown;
  let attachments: TeamPlanAttachment[] | null = null;
  if (Array.isArray(raw)) {
    attachments = raw.filter((x) => x && typeof x === 'object' && 'path' in x && 'url' in x) as TeamPlanAttachment[];
  } else if (raw && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      attachments = Array.isArray(parsed) ? (parsed as TeamPlanAttachment[]) : null;
    } catch {
      attachments = null;
    }
  }
  return { ...p, attachments: attachments?.length ? attachments : null };
}

function normalizePlans(rows: TeamPlanItem[]): TeamPlanItem[] {
  return rows.map(normalizePlan);
}
