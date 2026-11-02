/*
  # Security Hardening & Vulnerability Patches

  1. Storage Security on review-photos:
     - Fixes broken access control / IDOR where any authenticated user could delete any approved review's photos.
     - Adds `can_delete_review_photo` function to strictly verify the user is the review owner or an admin.
     - Enforces upload folder isolation so users can only upload into their own folder prefix `{user_id}/...`.

  2. Admins Table Data Leakage:
     - Revokes public/anon SELECT on `admins` table.
     - Limits authenticated users to querying only their own email row, or all rows if already an admin.
     - Prevents enumeration and scraping of administrator email addresses.

  3. Review Reports Integrity:
     - Ensures users cannot insert pre-resolved or pre-dismissed reports (enforces `status = 'pending'`).
*/

-- ═══ 1. STORAGE: REVIEW PHOTOS ACCESS & DELETE HARDENING ══════════════
CREATE OR REPLACE FUNCTION public.can_delete_review_photo(p_bucket_id text, p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_review_id uuid;
  v_review_user_id uuid;
BEGIN
  -- Only apply to review-photos bucket
  IF p_bucket_id != 'review-photos' THEN
    RETURN false;
  END IF;

  -- Admin can delete any photo
  IF is_admin() THEN
    RETURN true;
  END IF;

  -- Extract review_id from path format: {user_id}/{review_id}/{filename}
  BEGIN
    v_review_id := (string_to_array(p_object_name, '/'))[2]::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF v_review_id IS NULL THEN
    RETURN false;
  END IF;

  -- Fetch review owner
  SELECT user_id INTO v_review_user_id
  FROM public.reviews
  WHERE id = v_review_id;

  -- Only the review creator can delete their review photos
  RETURN v_review_user_id IS NOT NULL AND v_review_user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.can_delete_review_photo(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_review_photo(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_delete_review_photo(text, text) TO authenticated;

-- Tighten DELETE policy on review-photos storage
DROP POLICY IF EXISTS "review_photos_authenticated_delete" ON storage.objects;
CREATE POLICY "review_photos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'review-photos'
    AND public.can_delete_review_photo(bucket_id, name)
  );

-- Tighten INSERT policy on review-photos storage to enforce user-scoped path prefix
DROP POLICY IF EXISTS "review_photos_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_review_photos" ON storage.objects;
CREATE POLICY "review_photos_authenticated_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos'
    AND (
      is_admin()
      OR (string_to_array(name, '/'))[1] = auth.uid()::text
    )
  );

-- ═══ 2. ADMINS TABLE: PREVENT ADMIN EMAIL SCRAPING ════════════════════
DROP POLICY IF EXISTS "admins_read_public" ON public.admins;
DROP POLICY IF EXISTS "admins_read_authenticated" ON public.admins;

-- Authenticated users can only read their own email or all if admin
CREATE POLICY "admins_read_authenticated"
  ON public.admins FOR SELECT TO authenticated
  USING (
    is_admin()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
  );

-- Explicitly revoke SELECT from anon on admins table
REVOKE SELECT ON TABLE public.admins FROM anon;

-- ═══ 3. REVIEW REPORTS: PREVENT STATUS BYPASS ══════════════════════════
DROP POLICY IF EXISTS "reports_insert_own" ON public.review_reports;
CREATE POLICY "reports_insert_own"
  ON public.review_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reported_by
    AND status = 'pending'
  );

