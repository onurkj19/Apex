import supabase from '@/lib/supabase';
import type { NotificationItem } from '@/lib/erp-types';
import { getCurrentAdminMeta } from '@/lib/erp/session';

export type NotificationCreatePayload = Omit<NotificationItem, 'id' | 'created_at' | 'is_read' | 'is_archived'> & {
  is_read?: boolean;
  is_archived?: boolean;
};

export const notificationApi = {
  async list(includeArchived = false): Promise<NotificationItem[]> {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (!includeArchived) query = query.eq('is_archived', false);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as NotificationItem[];
  },
  async create(payload: NotificationCreatePayload) {
    const hasActor = Boolean(
      (payload.metadata as Record<string, unknown> | undefined)?.actor_admin_id ||
      (payload.metadata as Record<string, unknown> | undefined)?.actor_admin_name
    );
    const actorMeta = hasActor ? null : await getCurrentAdminMeta();

    const { error } = await supabase.from('notifications').insert({
      ...payload,
      is_read: payload.is_read ?? false,
      is_archived: payload.is_archived ?? false,
      metadata: {
        ...(payload.metadata || {}),
        ...(actorMeta || {}),
      },
    });
    if (error) throw error;
  },
  async unreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_archived', false);
    if (error) throw error;
    return count || 0;
  },
  async markRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },
  async archive(id: string) {
    const { error } = await supabase.from('notifications').update({ is_archived: true }).eq('id', id);
    if (error) throw error;
  },
  async unarchive(id: string) {
    const { error } = await supabase.from('notifications').update({ is_archived: false }).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  },
  async runChecks() {
    const today = new Date();
    const next30 = new Date();
    next30.setDate(today.getDate() + 30);

    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select('id, expires_at')
      .gte('expires_at', today.toISOString().slice(0, 10))
      .lte('expires_at', next30.toISOString().slice(0, 10));

    for (const c of expiringContracts || []) {
      await this.create({
        type: 'contract_expiring',
        title: 'Kontrate qe po skadon',
        message: `Kontrata ${c.id} skadon me ${c.expires_at}`,
        metadata: c,
      });
    }
  },
};

export const tryCreateNotification = async (payload: NotificationCreatePayload) => {
  try {
    const actorMeta = await getCurrentAdminMeta();
    await notificationApi.create({
      ...payload,
      metadata: {
        ...(payload.metadata || {}),
        ...(actorMeta || {}),
      },
    });
  } catch (error) {
    console.error('Failed to create notification', error);
  }
};

export const createAdminChangeNotification = async (
  title: string,
  message: string,
  metadata: Record<string, unknown> = {}
) => {
  await tryCreateNotification({
    type: 'admin_change',
    title,
    message,
    metadata,
  });
};
