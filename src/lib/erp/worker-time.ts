import supabase from '@/lib/supabase';
import type { WorkerTimeEntry } from '@/lib/erp-types';
import { tryCreateNotification } from '@/lib/erp/notifications';
import { getCurrentRole, getCurrentUser } from '@/lib/erp/session';
import { calculateWorkedMinutesWithFixedBreaks, toIsoDate } from '@/lib/erp/time';

export const workerTimeApi = {
  async getMyTodayEntry(): Promise<WorkerTimeEntry | null> {
    const user = await getCurrentUser();
    if (!user) return null;
    const today = toIsoDate(new Date());
    const { data, error } = await supabase
      .from('worker_time_entries')
      .select('*')
      .eq('worker_user_id', user.id)
      .eq('work_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as WorkerTimeEntry | null) || null;
  },
  async listMineRecent(limit = 14): Promise<WorkerTimeEntry[]> {
    const user = await getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('worker_time_entries')
      .select('*')
      .eq('worker_user_id', user.id)
      .order('work_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as WorkerTimeEntry[];
  },
  async startDay() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Nuk je i kycur.');
    const now = new Date();
    const today = toIsoDate(now);

    const { data: existingRunning } = await supabase
      .from('worker_time_entries')
      .select('id')
      .eq('worker_user_id', user.id)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingRunning?.id) {
      throw new Error('Ke nje sesion aktiv. Duhet ta ndalesh para se te fillosh nje te ri.');
    }

    const { data: profile } = await supabase.from('users').select('worker_id').eq('id', user.id).maybeSingle();
    const { error } = await supabase.from('worker_time_entries').insert({
      worker_user_id: user.id,
      worker_id: profile?.worker_id || null,
      work_date: today,
      start_at: now.toISOString(),
      break_minutes: 90,
      status: 'running',
    });
    if (error) throw error;
  },
  async stopDay() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Nuk je i kycur.');

    const { data: running, error: runningError } = await supabase
      .from('worker_time_entries')
      .select('*')
      .eq('worker_user_id', user.id)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runningError) throw runningError;
    if (!running) throw new Error('Nuk ke sesion aktiv per ta ndalur.');

    const endAt = new Date().toISOString();
    const workedMinutes = calculateWorkedMinutesWithFixedBreaks(String(running.start_at), endAt);

    const { error } = await supabase
      .from('worker_time_entries')
      .update({
        end_at: endAt,
        worked_minutes: workedMinutes,
        break_minutes: 90,
        status: 'submitted',
        submitted_at: endAt,
      })
      .eq('id', running.id);
    if (error) throw error;

    await tryCreateNotification({
      type: 'admin_change',
      title: 'Kerkese per aprovimin e oreve',
      message: `Punetori ${user.email || user.id} dergoi oret per aprovim (${(workedMinutes / 60).toFixed(2)} ore).`,
      metadata: {
        worker_user_id: user.id,
        worker_time_entry_id: running.id,
        worked_minutes: workedMinutes,
      },
    });
  },
  async listForApproval(status: WorkerTimeEntry['status'] | 'all' = 'submitted'): Promise<WorkerTimeEntry[]> {
    let query = supabase.from('worker_time_entries').select('*').order('work_date', { ascending: false }).limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as WorkerTimeEntry[];
  },
  async approve(id: string, comment?: string) {
    const role = await getCurrentRole();
    if (role !== 'super_admin') throw new Error('Vetem super admin mund te aprovoje oret.');
    const user = await getCurrentUser();
    if (!user) throw new Error('Nuk je i kycur.');
    const { error } = await supabase
      .from('worker_time_entries')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        super_admin_comment: comment || null,
      })
      .eq('id', id);
    if (error) throw error;
  },
  async reject(id: string, comment?: string) {
    const role = await getCurrentRole();
    if (role !== 'super_admin') throw new Error('Vetem super admin mund te refuzoje oret.');
    const { error } = await supabase
      .from('worker_time_entries')
      .update({
        status: 'rejected',
        super_admin_comment: comment || null,
      })
      .eq('id', id);
    if (error) throw error;
  },
};
