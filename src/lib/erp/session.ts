import supabase from '@/lib/supabase';
import type { AppRole } from '@/lib/erp-types';

export const getCurrentAdminMeta = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError || !profile) return null;

  return {
    actor_admin_id: profile.id,
    actor_admin_name: profile.full_name,
    actor_admin_email: profile.email,
    action_at: new Date().toISOString(),
  };
};

/** Pa varësi nga authApi (shmang ciklin e importeve). */
export const getCurrentRole = async (): Promise<AppRole | null> => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data: profile, error } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', sessionData.session.user.id)
    .single();
  if (error || !profile?.is_active) return null;
  return (profile.role as AppRole) || null;
};

export const getCurrentUser = async () => {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;
  return userData.user;
};
