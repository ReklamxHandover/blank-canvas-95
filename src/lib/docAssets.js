// Helpers for files stored in the private `doc-assets` Storage bucket.
// Values may be either a remote URL (legacy/public fallback) or a storage path.
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'doc-assets';

export function isStoragePath(value) {
  if (!value) return false;
  if (/^(https?:|data:|blob:)/i.test(value)) return false;
  if (value.startsWith('/')) return false;
  return true;
}

export async function resolveAssetUrl(value) {
  if (!value) return null;
  if (!isStoragePath(value)) return value;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 60 * 60);
  if (error) return null;
  return data?.signedUrl || null;
}

export async function uploadAsset(file, prefix = 'misc') {
  if (!file) return null;
  const ext = (file.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/png',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeAsset(path) {
  if (!path || !isStoragePath(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function loadAsDataUrl(value) {
  const url = await resolveAssetUrl(value);
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
