import supabase from '@/lib/supabase';

export type ProjectFileType = 'image' | 'video' | 'pdf' | 'plan' | 'safety' | 'other';

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_path: string | null;
  deleted_at?: string | null;
  storage_bucket?: 'erp-images' | 'erp-documents';
  file_type: ProjectFileType;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

const FILE_TYPE_MAP: Record<string, ProjectFileType> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
  'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video',
  'application/pdf': 'pdf',
};

function detectFileType(file: File, hint?: ProjectFileType): ProjectFileType {
  if (hint) return hint;
  return FILE_TYPE_MAP[file.type] ?? 'other';
}

export const projectFilesApi = {
  async list(projectId: string, deleted = false): Promise<ProjectFile[]> {
    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    query = deleted ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return Promise.all(((data ?? []) as ProjectFile[]).map(async file => {
      if (file.storage_bucket !== 'erp-documents' || !file.file_path) return file;
      const { data: signed, error: signedError } = await supabase.storage.from('erp-documents').createSignedUrl(file.file_path, 3600);
      if (signedError) return { ...file, file_url: '' };
      return { ...file, file_url: signed.signedUrl };
    }));
  },

  async upload(
    projectId: string,
    file: File,
    typeHint?: ProjectFileType,
  ): Promise<ProjectFile> {
    if (file.size > 50 * 1024 * 1024) throw new Error('Skedari duhet të jetë maksimumi 50 MB.');
    const fileType = detectFileType(file, typeHint);
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `project-files/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('erp-documents')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;

    const { data: signed, error: signError } = await supabase.storage.from('erp-documents').createSignedUrl(path, 3600);
    if (signError) { await supabase.storage.from('erp-documents').remove([path]); throw signError; }

    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_name: file.name,
        file_url: '',
        storage_bucket: 'erp-documents',
        file_path: path,
        file_type: fileType,
        file_size: file.size,
      })
      .select()
      .single();
    if (error) { await supabase.storage.from('erp-documents').remove([path]); throw error; }
    return { ...(data as ProjectFile), file_url: signed.signedUrl };
  },

  /** Reversible removal: retain the object and metadata for recovery. */
  async delete(file: ProjectFile): Promise<void> {
    const { data, error } = await supabase.from('project_files')
      .update({ deleted_at: new Date().toISOString() }).eq('id', file.id).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('Skedari nuk u hoq.');
  },
  async restore(id: string): Promise<void> {
    const { error } = await supabase.from('project_files').update({ deleted_at: null }).eq('id', id).select('id').single();
    if (error) throw error;
  },
};
