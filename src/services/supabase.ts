import supabase from '@/lib/supabase';

export interface SupabaseProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  image_url: string | null;
  image_path: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SupabaseProject {
  id: string;
  title: string;
  description: string;
  location: string;
  completed_date: string;
  client?: string | null;
  category?: string | null;
  duration?: string | null;
  created_at: string;
}

export interface SupabaseProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  image_path: string;
  created_at: string;
}

export const supabaseAPI = {
  getPublicProducts: async (): Promise<SupabaseProduct[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getPublicProjects: async (): Promise<(SupabaseProject & { images: SupabaseProjectImage[] })[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_images(*)')
      .order('completed_date', { ascending: false });

    if (error) throw error;
    return (data || []).map((project: any) => ({
      ...project,
      images: project.project_images || [],
    }));
  },
};

export default supabaseAPI;
