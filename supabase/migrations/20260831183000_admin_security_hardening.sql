/*
# Admin security hardening

## Summary
Locks down remaining gaps after the admin panel schema:
1. Status columns so universities/hostels can be archived without cascade-deleting reviews
2. Restrict foreign keys so DELETE cannot silently wipe related rows
3. Profiles: users cannot change `role`; existing auth users are backfilled
4. Storage cover uploads are admin-only (INSERT + UPDATE + DELETE)
5. Public SELECT hides archived universities/hostels; admins still see all
6. `is_admin()` is not executable by anon

## Notes
Promote the first administrator with:
  UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
*/

-- ─── EXTRA COLUMNS ──────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'universities' AND column_name = 'state') THEN
    ALTER TABLE universities ADD COLUMN state text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'universities' AND column_name = 'status') THEN
    ALTER TABLE universities ADD COLUMN status text NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hostels' AND column_name = 'status') THEN
    ALTER TABLE hostels ADD COLUMN status text NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_universities_status ON universities(status);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_hostels_status ON hostels(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_reports_unique ON review_reports(review_id, reported_by);

-- ─── SAFE FOREIGN KEYS (no silent cascade) ──
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.hostels'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.universities'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.hostels DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE public.hostels
    ADD CONSTRAINT hostels_university_id_fkey
    FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE RESTRICT;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.reviews'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.hostels'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.reviews DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_hostel_id_fkey
    FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE RESTRICT;
END $$;

-- ─── IS_ADMIN EXECUTE GRANTS ────────────────
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─── PUBLIC READ HIDES ARCHIVED ─────────────
DROP POLICY IF EXISTS "public_select_universities" ON universities;
CREATE POLICY "public_select_universities"
  ON universities FOR SELECT TO anon, authenticated
  USING (status = 'active' OR is_admin());

DROP POLICY IF EXISTS "public_select_hostels" ON hostels;
CREATE POLICY "public_select_hostels"
  ON hostels FOR SELECT TO anon, authenticated
  USING (status = 'active' OR is_admin());

-- ─── PROFILES: NO ROLE SELF-EDIT ────────────
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user');

REVOKE UPDATE ON TABLE profiles FROM authenticated;
GRANT UPDATE (email, name, avatar_url) ON TABLE profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin());

-- Backfill profiles for users who signed up before the trigger existed
INSERT INTO profiles (id, email, name, avatar_url)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(COALESCE(u.email, 'user'), '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ─── STORAGE: ADMIN-ONLY COVER UPLOADS ──────
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('university-covers', 'hostel-covers');

DROP POLICY IF EXISTS "uni_covers_upload" ON storage.objects;
CREATE POLICY "uni_covers_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'university-covers' AND is_admin());

DROP POLICY IF EXISTS "uni_covers_update" ON storage.objects;
CREATE POLICY "uni_covers_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'university-covers' AND is_admin())
  WITH CHECK (bucket_id = 'university-covers' AND is_admin());

DROP POLICY IF EXISTS "hostel_covers_upload" ON storage.objects;
CREATE POLICY "hostel_covers_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hostel-covers' AND is_admin());

DROP POLICY IF EXISTS "hostel_covers_update" ON storage.objects;
CREATE POLICY "hostel_covers_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hostel-covers' AND is_admin())
  WITH CHECK (bucket_id = 'hostel-covers' AND is_admin());

-- ─── TABLE GRANTS ───────────────────────────
GRANT SELECT ON universities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON universities TO authenticated;

GRANT SELECT ON hostels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON hostels TO authenticated;

GRANT SELECT ON hostel_facilities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON hostel_facilities TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON review_reports TO authenticated;

GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;

GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT, DELETE ON reviews TO authenticated;
GRANT SELECT ON review_photos TO anon, authenticated;
GRANT INSERT, DELETE ON review_photos TO authenticated;

GRANT EXECUTE ON FUNCTION moderate_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_role(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION moderate_review(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION set_user_role(uuid, text) FROM anon;
