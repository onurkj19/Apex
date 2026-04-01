import supabase from '@/lib/supabase';
import type { AuditLogItem } from '@/lib/erp-types';

export const auditApi = {
  async list(filters?: { tableName?: string; operation?: string; userId?: string; search?: string; from?: string; to?: string }) {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (filters?.tableName) query = query.eq('table_name', filters.tableName);
    if (filters?.operation) query = query.eq('operation', filters.operation);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.from) query = query.gte('created_at', filters.from);
    if (filters?.to) query = query.lte('created_at', filters.to);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as AuditLogItem[];
    if (!filters?.search) return rows;

    const q = filters.search.toLowerCase();
    return rows.filter((row) =>
      [row.table_name, row.operation, row.record_id || '', JSON.stringify(row.old_data || {}), JSON.stringify(row.new_data || {})]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  },
};
