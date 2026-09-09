
/*
# Rate My Room - Storage bucket for review photos

Creates a public storage bucket for review photo uploads.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "auth_upload_review_photos" ON storage.objects;
CREATE POLICY "auth_upload_review_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos');

-- Allow public read
DROP POLICY IF EXISTS "public_read_review_photos_storage" ON storage.objects;
CREATE POLICY "public_read_review_photos_storage" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-photos');

-- Allow owners to delete
DROP POLICY IF EXISTS "auth_delete_review_photos_storage" ON storage.objects;
CREATE POLICY "auth_delete_review_photos_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND auth.uid() = owner);
