import supabase from '@/lib/supabase';
import { fetchPublicProjectsWithImages, type PublicProjectWithImages } from '@/lib/public-site-api';

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

/** @deprecated Tabela `products` mund të mos ekzistojë në Supabase; përdor vetëm nëse e keni krijuar. */
export const supabaseAPI = {
  getPublicProducts: async (): Promise<SupabaseProduct[]> => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    if (error) {
      console.warn('[supabaseAPI.getPublicProducts]', error.message);
      return [];
    }
    return data || [];
  },

  getPublicProjects: (): Promise<PublicProjectWithImages[]> => fetchPublicProjectsWithImages(),
};

export default supabaseAPI;
