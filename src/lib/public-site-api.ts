import supabase from '@/lib/supabase';

/** Statuset e projekteve që lejohen në website publik (RLS `anon` duhet të përputhet). */
export const WEBSITE_VISIBLE_PROJECT_STATUSES = ['I pranuar', 'Ne pune', 'I perfunduar'] as const;

export interface PublicProjectRow {
  id: string;
  project_name: string;
  description: string | null;
  location: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  progress: number;
  created_at: string;
}

export interface PublicProjectImageRow {
  id: string;
  project_id: string;
  image_url: string;
  image_path: string | null;
  created_at: string;
}

export type PublicProjectWithImages = PublicProjectRow & { images: PublicProjectImageRow[] };

/**
 * Projekte për faqen publike (pa klient, pa të ardhura, pa kosto).
 * Përdor vetëm kolona të lejuara; RLS për `anon` në Supabase duhet të jetë aktivizuar.
 */
export async function fetchPublicProjectsWithImages(): Promise<PublicProjectWithImages[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      id,
      project_name,
      description,
      location,
      start_date,
      end_date,
      status,
      progress,
      created_at,
      project_images (
        id,
        project_id,
        image_url,
        image_path,
        created_at
      )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((project: Record<string, unknown>) => {
    const nested = project.project_images as PublicProjectImageRow[] | undefined;
    const { project_images: _omit, ...rest } = project;
    return {
      ...(rest as PublicProjectRow),
      images: Array.isArray(nested) ? nested : [],
    };
  });
}
