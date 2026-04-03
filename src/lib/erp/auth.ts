import supabase from '@/lib/supabase';
import type { AppRole } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export const authApi = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async getAdminSession() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return null;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, is_active, full_name, email, is_online, last_seen_at, worker_id')
      .eq('id', sessionData.session.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.is_active) return null;
    return { session: sessionData.session, profile };
  },
  async setPresence(isOnline: boolean) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const { error } = await supabase
      .from('users')
      .update({
        is_online: isOnline,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', userData.user.id);
    if (error) throw error;
  },
  async listAdminPresence() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, is_online, last_seen_at')
      .in('role', ['admin', 'super_admin', 'finance', 'project_manager', 'viewer'])
      .order('full_name', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async updateUserRole(userId: string, role: AppRole) {
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (targetError) throw targetError;
    if (targetUser.role === 'super_admin') {
      throw new Error('Super admini eshte i mbrojtur dhe nuk mund te ndryshohet.');
    }

    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    if (error) throw error;
    await createAdminChangeNotification('Roli i perdoruesit u ndryshua', `Perdoruesi ${userId} u caktua si ${role}`, {
      user_id: userId,
      role,
    });
  },
  async listAppUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, is_online, last_seen_at, worker_id')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createAppUser(payload: {
    email: string;
    password: string;
    full_name: string;
    role: AppRole;
    worker_id?: string | null;
    /** Kur role=`worker` dhe nuk zgjedh punëtor ekzistues: dërgohet te edge për rreshtin e ri në `workers`. */
    worker_defaults?: {
      hourly_rate?: number;
      job_role?: string;
      group_name?: string;
    } | null;
  }) {
    const normalizedEmail = payload.email.trim().toLowerCase();

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingUser?.id) {
      throw new Error('Ky email ekziston tashme.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-app-user', {
        body: { ...payload, email: normalizedEmail },
      });
      if (error) throw error;
      if (data && typeof data === 'object' && 'success' in data && (data as { success?: boolean }).success === false) {
        throw new Error(String((data as { error?: string }).error || 'Nuk u arrit krijimi i user-it.'));
      }
      return data;
    } catch (error: unknown) {
      let parsedMessage: string | null = null;
      const err = error as {
        context?: { json?: () => Promise<unknown>; text?: () => Promise<string> };
        message?: string;
      };

      if (typeof err?.context?.json === 'function') {
        try {
          const details = (await err.context.json()) as { error?: string };
          if (details?.error) {
            parsedMessage = String(details.error);
          }
        } catch {
          if (typeof err?.context?.text === 'function') {
            try {
              const raw = await err.context.text();
              if (raw) {
                parsedMessage = String(raw);
              }
            } catch {
              /* ignore */
            }
          }
        }
      }
      throw new Error(parsedMessage || err?.message || 'Nuk u arrit krijimi i user-it.');
    }
  },

  /** Fshin përdoruesin nga Auth (`public.users` CASCADE). Përdor RPC `delete_app_user` (SQL në Supabase). */
  async deleteAppUser(userId: string) {
    const { data, error } = await supabase.rpc('delete_app_user', { target_user_id: userId });
    if (error) throw new Error(error.message || 'Nuk u arrit fshirja e perdoruesit.');
    if (data && typeof data === 'object' && 'success' in (data as object) && (data as { success?: boolean }).success === false) {
      throw new Error('Fshirja deshtoi.');
    }
  },

  /** Lidh përdoruesit në Auth që mungojnë në `public.users` dhe krijon punëtorë për rolin worker (RPC në DB). */
  async syncMissingProfiles(): Promise<{ users_created: number; workers_linked: number }> {
    const { data, error } = await supabase.rpc('sync_missing_profiles');
    if (error) throw error;
    const row = data as { users_created?: number; workers_linked?: number } | null;
    return {
      users_created: Number(row?.users_created ?? 0),
      workers_linked: Number(row?.workers_linked ?? 0),
    };
  },
};
