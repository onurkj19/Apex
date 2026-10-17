import supabase from '@/lib/supabase';

/** Persist object paths, resolve short-lived URLs when reading. Never make ERP documents public. */
export async function documentUrl(path?: string | null, legacyUrl?: string | null): Promise<string | null> {
  let objectPath = path;
  if (!objectPath && legacyUrl?.includes('/erp-documents/')) {
    objectPath = decodeURIComponent(legacyUrl.split('/erp-documents/')[1].split('?')[0]);
  }
  if (!objectPath) return legacyUrl || null;
  const { data, error } = await supabase.storage.from('erp-documents').createSignedUrl(objectPath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
