/*
# Admin Email Whitelist, Admins Table, and University Photos

## Summary
1. Creates an `admins` table to store allowed administrator emails, seeded with 'navalkrish2007@gmail.com'.
2. Updates admin verification so users with emails in `admins` or 'navalkrish2007@gmail.com' receive admin privileges.
3. Automatically sets `role = 'admin'` in `profiles` for whitelisted admin emails on signup or sign-in.
4. Adds a `photos text[]` column to `universities` table to store multiple photo URLs.
5. Ensures `university-covers` storage bucket exists and has proper permissions.
*/

-- ═══ 1. ADMINS TABLE ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to check if an email is an admin
DROP POLICY IF EXISTS "admins_read_authenticated" ON admins;
CREATE POLICY "admins_read_authenticated"
  ON admins FOR SELECT TO authenticated
  USING (true);

-- Allow public read so auth checks can verify before full profile load
DROP POLICY IF EXISTS "admins_read_public" ON admins;
CREATE POLICY "admins_read_public"
  ON admins FOR SELECT TO anon
  USING (true);

-- Allow admins to manage the admins table
DROP POLICY IF EXISTS "admins_write_admin" ON admins;
CREATE POLICY "admins_write_admin"
  ON admins FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR lower(auth.jwt()->>'email') = 'navalkrish2007@gmail.com'
    OR EXISTS (SELECT 1 FROM admins a WHERE lower(a.email) = lower(auth.jwt()->>'email'))
  );

-- Seed default primary admin
INSERT INTO admins (email)
VALUES ('navalkrish2007@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- ═══ 2. AUTO-PROMOTE ADMIN IN PROFILES ════════════════════════════
-- Ensure existing profile for navalkrish2007@gmail.com is admin
UPDATE profiles
SET role = 'admin'
WHERE lower(email) = 'navalkrish2007@gmail.com'
   OR EXISTS (SELECT 1 FROM admins a WHERE lower(a.email) = lower(profiles.email));

-- Update handle_new_user trigger to assign admin role if email matches
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text := 'user';
BEGIN
  IF lower(NEW.email) = 'navalkrish2007@gmail.com'
     OR EXISTS (SELECT 1 FROM admins WHERE lower(email) = lower(NEW.email)) THEN
    v_role := 'admin';
  END IF;

  INSERT INTO profiles (id, email, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    v_role
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
      WHEN lower(EXCLUDED.email) = 'navalkrish2007@gmail.com'
           OR EXISTS (SELECT 1 FROM admins WHERE lower(email) = lower(EXCLUDED.email)) THEN 'admin'
      ELSE profiles.role
    END;
  RETURN NEW;
END;
$$;

-- ═══ 3. UPDATE is_admin() FUNCTION ═══════════════════════════════
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    lower(COALESCE(auth.jwt()->>'email', '')) = 'navalkrish2007@gmail.com'
    OR EXISTS (
      SELECT 1 FROM admins
      WHERE lower(admins.email) = lower(auth.jwt()->>'email')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ═══ 4. UNIVERSITIES PHOTOS COLUMN ═══════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'photos'
  ) THEN
    ALTER TABLE universities ADD COLUMN photos text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Populate photos array from existing cover_image_url / image_url if empty
UPDATE universities
SET photos = ARRAY[cover_image_url]
WHERE (photos IS NULL OR cardinality(photos) = 0)
  AND cover_image_url IS NOT NULL;

UPDATE universities
SET photos = ARRAY[image_url]
WHERE (photos IS NULL OR cardinality(photos) = 0)
  AND image_url IS NOT NULL;

-- ═══ 5. STORAGE BUCKET FOR COVERS / PHOTOS ════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('university-covers', 'university-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;
