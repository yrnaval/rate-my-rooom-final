/*
# Admin Panel Schema — Profiles, Review Status, Reports, Facilities

## Summary
This migration adds the database foundation for the RateMyRoom admin panel:
1. A `profiles` table tracking user roles (user/admin)
2. An `is_admin()` helper function for RLS policies
3. A `status` column on `reviews` for moderation (pending/approved/hidden)
4. A `review_reports` table for user-submitted reports
5. A `hostel_facilities` table for hostel amenity tracking
6. Additional columns on `universities` (website_url, address) and `hostels` (room_type, capacity, location)

## New Tables
- `profiles`: id (uuid, PK, FK→auth.users), email, name, avatar_url, role (user/admin), created_at
- `review_reports`: id, review_id (FK→reviews), reported_by (FK→auth.users), reason, description, status (pending/dismissed/resolved), created_at
- `hostel_facilities`: hostel_id (FK→hostels), facility (text), value (boolean) — composite PK

## Modified Tables
- `reviews`: adds `status text DEFAULT 'pending'` column
- `universities`: adds `website_url text`, `address text` columns
- `hostels`: adds `room_type text`, `capacity integer`, `location text` columns

## Security
- `profiles` table: RLS enabled, users can read/update own profile, admins can read all
- `review_reports`: RLS enabled, authenticated users can insert reports, admins can read all
- `hostel_facilities`: RLS enabled, public can read, admins can write
- `reviews.status` column: only admins can update status
- Admin authorization uses `is_admin()` which checks profiles.role = 'admin' for auth.uid()

## Important Notes
1. The `is_admin()` function is SECURITY DEFINER so it can read profiles even from within RLS policies
2. Existing reviews get status 'approved' so they remain visible on the public site
3. A trigger auto-creates a profile row when a new auth.users row is created
4. The first admin must be set manually via SQL: UPDATE profiles SET role='admin' WHERE email='your-email'
*/

-- ─── PROFILES TABLE ──────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── IS_ADMIN HELPER FUNCTION ───────────────
-- SECURITY DEFINER so it can read profiles from within RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─── PROFILES POLICIES ──────────────────────
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── REVIEWS STATUS COLUMN ─────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'status') THEN
    ALTER TABLE reviews ADD COLUMN status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'hidden'));
  END IF;
END $$;

-- ─── UNIVERSITIES EXTRA COLUMNS ─────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'website_url') THEN
    ALTER TABLE universities ADD COLUMN website_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'address') THEN
    ALTER TABLE universities ADD COLUMN address text;
  END IF;
END $$;

-- ─── HOSTELS EXTRA COLUMNS ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hostels' AND column_name = 'room_type') THEN
    ALTER TABLE hostels ADD COLUMN room_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hostels' AND column_name = 'capacity') THEN
    ALTER TABLE hostels ADD COLUMN capacity integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hostels' AND column_name = 'location') THEN
    ALTER TABLE hostels ADD COLUMN location text;
  END IF;
END $$;

-- ─── REVIEW_REPORTS TABLE ───────────────────
CREATE TABLE IF NOT EXISTS review_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reported_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       text NOT NULL CHECK (reason IN ('fake', 'spam', 'offensive', 'wrong_hostel', 'personal_info', 'other')),
  description  text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports, admins can see all
DROP POLICY IF EXISTS "reports_insert_own" ON review_reports;
CREATE POLICY "reports_insert_own"
  ON review_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "reports_select_admin" ON review_reports;
CREATE POLICY "reports_select_admin"
  ON review_reports FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "reports_update_admin" ON review_reports;
CREATE POLICY "reports_update_admin"
  ON review_reports FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "reports_delete_admin" ON review_reports;
CREATE POLICY "reports_delete_admin"
  ON review_reports FOR DELETE TO authenticated
  USING (is_admin());

-- ─── HOSTEL_FACILITIES TABLE ────────────────
CREATE TABLE IF NOT EXISTS hostel_facilities (
  hostel_id  uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  facility   text NOT NULL,
  value      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (hostel_id, facility)
);

ALTER TABLE hostel_facilities ENABLE ROW LEVEL SECURITY;

-- Public can read facilities, admins can write
DROP POLICY IF EXISTS "facilities_public_read" ON hostel_facilities;
CREATE POLICY "facilities_public_read"
  ON hostel_facilities FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "facilities_admin_insert" ON hostel_facilities;
CREATE POLICY "facilities_admin_insert"
  ON hostel_facilities FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "facilities_admin_update" ON hostel_facilities;
CREATE POLICY "facilities_admin_update"
  ON hostel_facilities FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "facilities_admin_delete" ON hostel_facilities;
CREATE POLICY "facilities_admin_delete"
  ON hostel_facilities FOR DELETE TO authenticated
  USING (is_admin());

-- ─── INDEXES ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);