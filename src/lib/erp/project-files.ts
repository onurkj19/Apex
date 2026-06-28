import supabase from '@/lib/supabase';

export type ProjectFileType = 'image' | 'video' | 'pdf' | 'plan' | 'safety' | 'other';

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_path: string | null;
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
  async list(projectId: string): Promise<ProjectFile[]> {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProjectFile[];
  },

  async upload(
    projectId: string,
    file: File,
    typeHint?: ProjectFileType,
  ): Promise<ProjectFile> {
    const fileType = detectFileType(file, typeHint);
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `project-files/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('erp-images')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('erp-images').getPublicUrl(path);

    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_path: path,
        file_type: fileType,
        file_size: file.size,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ProjectFile;
  },

  async delete(file: ProjectFile): Promise<void> {
    if (file.file_path) {
      await supabase.storage.from('erp-images').remove([file.file_path]);
    }
    const { error } = await supabase.from('project_files').delete().eq('id', file.id);
    if (error) throw error;
  },
};
