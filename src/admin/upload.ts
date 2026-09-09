import { supabase } from '../lib/supabase';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed';
  }
  if (file.size > MAX_SIZE) {
    return 'Image must be under 5MB';
  }
  return null;
}

export async function ensureBucket(bucket: string): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.id === bucket || b.name === bucket)) {
      await supabase.storage.createBucket(bucket, { public: true });
    }
  } catch {
    // If creation fails due to RLS/permissions, proceed to upload as the bucket may already exist on DB level
  }
}

export async function uploadImage(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  await ensureBucket(bucket);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(`Failed to upload image: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadMultipleImages(
  bucket: string,
  items: { path: string; file: File }[],
): Promise<string[]> {
  await ensureBucket(bucket);
  return Promise.all(
    items.map(async item => {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(item.path, item.file, { contentType: item.file.type, upsert: true });
      if (error) throw new Error(`Failed to upload ${item.file.name}: ${error.message}`);
      const { data } = supabase.storage.from(bucket).getPublicUrl(item.path);
      return data.publicUrl;
    }),
  );
}

export async function removeImage(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Failed to remove image: ${error.message}`);
}

/** Returns a managed storage path, never a third-party image URL. */
export function getPublicStoragePath(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname;
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const pathIndex = pathname.indexOf(prefix);
    return pathIndex === -1 ? null : decodeURIComponent(pathname.slice(pathIndex + prefix.length));
  } catch {
    return null;
  }
}
