/*
  Review Photos Storage Lockdown

  The review-photos bucket currently allows public read of all photos via storage policies.
  This migration adds storage policies that enforce the same access control as the
  review_photos table RLS: only approved review photos are publicly accessible;
  authenticated users can access their own review photos; admins can access all.
*/

-- Helper function to check if a review photo path is accessible
-- Path format: {user_id}/{review_id}/{timestamp}.{ext}
CREATE OR REPLACE FUNCTION can_access_review_photo(p_bucket_id text, p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_review_id uuid;
  v_user_id uuid;
  v_is_admin boolean;
  v_review_status text;
  v_review_user_id uuid;
BEGIN
  -- Only enforce on review-photos bucket
  IF p_bucket_id != 'review-photos' THEN
    RETURN true;
  END IF;

  -- Extract review_id from path: {user_id}/{review_id}/...
  -- Find the first UUID-like segment after the first slash
  v_review_id := NULL;
  BEGIN
    -- Split path by '/' and get the second segment (index 1)
    v_review_id := (string_to_array(p_object_name, '/'))[2]::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false; -- Invalid path format
  END;

  IF v_review_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get review status and owner
  SELECT status, user_id INTO v_review_status, v_review_user_id
  FROM reviews
  WHERE id = v_review_id;

  IF v_review_status IS NULL THEN
    RETURN false; -- Review not found
  END IF;

  -- Check if current user is admin
  v_is_admin := is_admin();

  -- Admin can access all
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Get current user ID (may be null for anon)
  v_user_id := auth.uid();

  -- Anon users: only approved reviews
  IF v_user_id IS NULL THEN
    RETURN v_review_status = 'approved';
  END IF;

  -- Authenticated users: approved reviews OR own reviews
  RETURN v_review_status = 'approved' OR v_review_user_id = v_user_id;
END;
$$;

-- Grant execute to both anon and authenticated for policy evaluation
REVOKE ALL ON FUNCTION can_access_review_photo(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_access_review_photo(text, text) TO anon, authenticated;

-- Update storage policies for review-photos bucket
DROP POLICY IF EXISTS "public_read_review_photos_storage" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_review_photos" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_review_photos_storage" ON storage.objects;

-- Public read: only approved review photos
CREATE POLICY "review_photos_public_read"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'review-photos' AND can_access_review_photo(bucket_id, name));

-- Authenticated read: approved + own review photos
CREATE POLICY "review_photos_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'review-photos' AND can_access_review_photo(bucket_id, name));

-- Upload: authenticated users can upload (validated by review_photos table RLS on insert)
CREATE POLICY "review_photos_authenticated_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos');

-- Delete: owners or admins (validated by review_photos table RLS on delete)
CREATE POLICY "review_photos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND can_access_review_photo(bucket_id, name));