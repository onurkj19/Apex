import supabase from '@/lib/supabase';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface ProjectIssue {
  id: string;
  project_id: string;
  reported_by: string | null;
  worker_id: string | null;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  photo_url: string | null;
  photo_path: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MaterialRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Delivered';

export interface MaterialRequest {
  id: string;
  project_id: string;
  requested_by: string | null;
  worker_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  status: MaterialRequestStatus;
  created_at: string;
  updated_at: string;
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export const projectIssuesApi = {
  async list(projectId: string): Promise<ProjectIssue[]> {
    const { data, error } = await supabase
      .from('project_issues')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProjectIssue[];
  },

  async listAll(): Promise<ProjectIssue[]> {
    const { data, error } = await supabase
      .from('project_issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProjectIssue[];
  },

  async create(payload: {
    project_id: string;
    title: string;
    description?: string;
    severity?: IssueSeverity;
    worker_id?: string;
    photo_url?: string;
    photo_path?: string;
  }): Promise<ProjectIssue> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('project_issues')
      .insert({ ...payload, reported_by: user?.id ?? null })
      .select()
      .single();
    if (error) throw error;
    return data as ProjectIssue;
  },

  async updateStatus(id: string, status: IssueStatus): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === 'Resolved' || status === 'Closed') {
      const { data: { user } } = await supabase.auth.getUser();
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user?.id ?? null;
    }
    const { error } = await supabase.from('project_issues').update(patch).eq('id', id);
    if (error) throw error;
  },

  async uploadPhoto(file: File): Promise<{ url: string; path: string }> {
    const path = `project-files/issues/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() ?? 'jpg'}`;
    const { error } = await supabase.storage.from('erp-images').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('erp-images').getPublicUrl(path);
    return { url: data.publicUrl, path };
  },
};

// ─── Material Requests ────────────────────────────────────────────────────────

export const materialRequestsApi = {
  async list(projectId: string): Promise<MaterialRequest[]> {
    const { data, error } = await supabase
      .from('material_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MaterialRequest[];
  },

  async listAll(): Promise<MaterialRequest[]> {
    const { data, error } = await supabase
      .from('material_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MaterialRequest[];
  },

  async create(payload: {
    project_id: string;
    item_name: string;
    quantity: number;
    unit?: string;
    notes?: string;
    worker_id?: string;
  }): Promise<MaterialRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('material_requests')
      .insert({ ...payload, requested_by: user?.id ?? null })
      .select()
      .single();
    if (error) throw error;
    return data as MaterialRequest;
  },

  async updateStatus(id: string, status: MaterialRequestStatus): Promise<void> {
    const { error } = await supabase
      .from('material_requests')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },
};
