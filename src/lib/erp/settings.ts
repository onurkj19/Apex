import supabase from '@/lib/supabase';
import type { SystemSettings } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';
import { DEFAULT_SYSTEM_SETTINGS } from '@/lib/erp/constants';

export const settingsApi = {
  async get(): Promise<SystemSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'system')
      .maybeSingle();
    if (error) throw error;

    if (!data?.setting_value) return DEFAULT_SYSTEM_SETTINGS;

    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...(data.setting_value as Partial<SystemSettings>),
    };
  },
  async save(payload: SystemSettings) {
    const { error } = await supabase.from('app_settings').upsert(
      {
        setting_key: 'system',
        setting_value: payload,
      },
      { onConflict: 'setting_key' }
    );
    if (error) throw error;
    await createAdminChangeNotification('Cilesimet u perditesuan', 'Ndryshime ne cilesimet e sistemit u ruajten', { settings: payload });
    return payload;
  },
};
