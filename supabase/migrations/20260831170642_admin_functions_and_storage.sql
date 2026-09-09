/*
# Admin Moderation Function + Storage Buckets

## Summary
1. Creates a `moderate_review()` SECURITY DEFINER function so admins can update
   review status (approve/hide) — needed because column-level grants revoked UPDATE
   on the status column from authenticated users.
2. Creates a `set_user_role()` SECURITY DEFINER function for admin user management.
3. Creates storage buckets for university and hostel cover images.

## Functions
- `moderate_review(p_review_id uuid, p_status text)`: admin sets review status
- `set_user_role(p_user_id uuid, p_role text)`: admin changes a user's role

## Storage
- `university-covers` bucket (public)
- `hostel-covers` bucket (public)
- Policies: authenticated users can upload, public can read
*/

-- ═══ MODERATE REVIEW FUNCTION ═══════════════
CREATE OR REPLACE FUNCTION moderate_review(p_review_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'hidden') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE reviews SET status = p_status WHERE id = p_review_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION moderate_review FROM anon;
GRANT EXECUTE ON FUNCTION moderate_review TO authenticated;

-- ═══ SET USER ROLE FUNCTION ═════════════════
CREATE OR REPLACE FUNCTION set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_count int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  -- Prevent removing the last admin
  IF p_role = 'user' THEN
    SELECT count(*) INTO v_admin_count FROM profiles WHERE role = 'admin';
    IF v_admin_count <= 1 AND EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin') THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;
  UPDATE profiles SET role = p_role WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_user_role FROM anon;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;

-- ═══ STORAGE BUCKETS ═══════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES
  ('university-covers', 'university-covers', true),
  ('hostel-covers', 'hostel-covers', true)
ON CONFLICT (id) DO NOTHING;

-- ═══ STORAGE POLICIES ══════════════════════
-- University covers: authenticated upload, public read
DROP POLICY IF EXISTS "uni_covers_read" ON storage.objects;
CREATE POLICY "uni_covers_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'university-covers');

DROP POLICY IF EXISTS "uni_covers_upload" ON storage.objects;
CREATE POLICY "uni_covers_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'university-covers');

DROP POLICY IF EXISTS "uni_covers_update" ON storage.objects;
CREATE POLICY "uni_covers_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'university-covers' AND is_admin())
  WITH CHECK (bucket_id = 'university-covers' AND is_admin());

DROP POLICY IF EXISTS "uni_covers_delete" ON storage.objects;
CREATE POLICY "uni_covers_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'university-covers' AND is_admin());

-- Hostel covers: authenticated upload, public read
DROP POLICY IF EXISTS "hostel_covers_read" ON storage.objects;
CREATE POLICY "hostel_covers_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'hostel-covers');

DROP POLICY IF EXISTS "hostel_covers_upload" ON storage.objects;
CREATE POLICY "hostel_covers_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hostel-covers');

DROP POLICY IF EXISTS "hostel_covers_update" ON storage.objects;
CREATE POLICY "hostel_covers_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hostel-covers' AND is_admin())
  WITH CHECK (bucket_id = 'hostel-covers' AND is_admin());

DROP POLICY IF EXISTS "hostel_covers_delete" ON storage.objects;
CREATE POLICY "hostel_covers_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hostel-covers' AND is_admin());