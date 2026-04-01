import supabase from '@/lib/supabase';
import type { LeaveRequest } from '@/lib/erp-types';
import { getCurrentRole, getCurrentUser } from '@/lib/erp/session';

export const leaveRequestApi = {
  async listMine(): Promise<LeaveRequest[]> {
    const user = await getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('worker_user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LeaveRequest[];
  },
  async createMine(payload: {
    request_type: LeaveRequest['request_type'];
    requested_start_date: string;
    requested_end_date: string;
    worker_comment?: string | null;
  }) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Nuk je i kycur.');

    const { data: profile } = await supabase.from('users').select('worker_id').eq('id', user.id).maybeSingle();
    const { error } = await supabase.from('leave_requests').insert({
      worker_user_id: user.id,
      worker_id: profile?.worker_id || null,
      request_type: payload.request_type,
      requested_start_date: payload.requested_start_date,
      requested_end_date: payload.requested_end_date,
      worker_comment: payload.worker_comment || null,
      status: 'pending',
    });
    if (error) throw error;
  },
  async respondToCounter(id: string, payload: { accept: boolean; new_start_date?: string; new_end_date?: string; worker_comment?: string }) {
    if (payload.accept) {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          worker_comment: payload.worker_comment || null,
        })
        .eq('id', id);
      if (error) throw error;
      return;
    }

    if (!payload.new_start_date || !payload.new_end_date) {
      throw new Error('Duhet te vendosesh datat e reja per kunderoferte.');
    }
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'worker_countered',
        requested_start_date: payload.new_start_date,
        requested_end_date: payload.new_end_date,
        worker_comment: payload.worker_comment || null,
      })
      .eq('id', id);
    if (error) throw error;
  },
  async listAll(): Promise<LeaveRequest[]> {
    const { data, error } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LeaveRequest[];
  },
  async adminDecision(
    id: string,
    payload:
      | { type: 'approve'; admin_comment?: string }
      | { type: 'reject'; admin_comment?: string }
      | { type: 'counter_offer'; counter_start_date: string; counter_end_date: string; admin_comment?: string }
  ) {
    const role = await getCurrentRole();
    if (role !== 'super_admin') {
      throw new Error('Vetem super admin mund te menaxhoje pushimet.');
    }

    if (payload.type === 'approve') {
      const { error } = await supabase.from('leave_requests').update({ status: 'approved', admin_comment: payload.admin_comment || null }).eq('id', id);
      if (error) throw error;
      return;
    }
    if (payload.type === 'reject') {
      const { error } = await supabase.from('leave_requests').update({ status: 'rejected', admin_comment: payload.admin_comment || null }).eq('id', id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'counter_offered',
        admin_counter_start_date: payload.counter_start_date,
        admin_counter_end_date: payload.counter_end_date,
        admin_comment: payload.admin_comment || null,
      })
      .eq('id', id);
    if (error) throw error;
  },
};
