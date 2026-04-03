import supabase from '@/lib/supabase';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export type WebsiteHomeHeroRow = {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  stats: Record<string, string> | null;
  image_url: string | null;
  image_path: string | null;
  updated_at?: string;
};

export const websiteContentApi = {
  async getHomeHero(): Promise<WebsiteHomeHeroRow | null> {
    const { data, error } = await supabase
      .from('website_content')
      .select('*')
      .eq('section_key', 'home_hero')
      .maybeSingle();
    if (error) throw error;
    return data as WebsiteHomeHeroRow | null;
  },
  async uploadImage(file: File) {
    const path = `hero/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('erp-images').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('erp-images').getPublicUrl(path);
    return { path, url: data.publicUrl };
  },
  async saveHomeHero(payload: { title: string; subtitle: string; image_url?: string; image_path?: string; stats: Record<string, string> }) {
    const { error } = await supabase
      .from('website_content')
      .upsert({ section_key: 'home_hero', ...payload }, { onConflict: 'section_key' });
    if (error) throw error;
    await createAdminChangeNotification('Permbajtja e web u perditesua', 'Seksioni home_hero u perditesua', { section_key: 'home_hero' });
  },
};
