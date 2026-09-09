
/*
# Rate My Room - Extend existing schema

Adds hostels table and missing columns to work alongside existing universities/reviews/review_photos tables.

## Changes
- Add short_name, country, cover_image_url columns to universities
- Create hostels table linked to universities
- Add hostel_id, value, stay_period, user_name, user_avatar columns to reviews
- Rename review_photos.url to photo_url (add alias column)
- Update/add RLS policies
- Seed universities and hostels
*/

-- Extend universities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='short_name') THEN
    ALTER TABLE universities ADD COLUMN short_name text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='country') THEN
    ALTER TABLE universities ADD COLUMN country text NOT NULL DEFAULT 'Kenya';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='cover_image_url') THEN
    ALTER TABLE universities ADD COLUMN cover_image_url text;
  END IF;
END $$;

-- Create hostels table
CREATE TABLE IF NOT EXISTS hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'mixed' CHECK (type IN ('male', 'female', 'mixed')),
  description text,
  cover_image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hostels" ON hostels;
CREATE POLICY "public_read_hostels" ON hostels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_hostels" ON hostels;
CREATE POLICY "auth_insert_hostels" ON hostels FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hostels_university_id ON hostels(university_id);

-- Extend reviews table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='hostel_id') THEN
    ALTER TABLE reviews ADD COLUMN hostel_id uuid REFERENCES hostels(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='value') THEN
    ALTER TABLE reviews ADD COLUMN value int2 CHECK (value BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='stay_period') THEN
    ALTER TABLE reviews ADD COLUMN stay_period text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='user_name') THEN
    ALTER TABLE reviews ADD COLUMN user_name text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='user_avatar') THEN
    ALTER TABLE reviews ADD COLUMN user_avatar text;
  END IF;
END $$;

-- Add photo_url alias on review_photos if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_photos' AND column_name='photo_url') THEN
    ALTER TABLE review_photos ADD COLUMN photo_url text;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_hostel_id ON reviews(hostel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Fix/update policies on reviews
DROP POLICY IF EXISTS "public_select_reviews" ON reviews;
CREATE POLICY "public_select_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
CREATE POLICY "auth_insert_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_own_reviews" ON reviews;
CREATE POLICY "auth_update_own_reviews" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_reviews" ON reviews;
CREATE POLICY "auth_delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Fix review_photos policies
DROP POLICY IF EXISTS "public_select_review_photos" ON review_photos;
CREATE POLICY "public_select_review_photos" ON review_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_review_photos" ON review_photos;
CREATE POLICY "auth_insert_review_photos" ON review_photos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_review_photos" ON review_photos;
CREATE POLICY "auth_delete_review_photos" ON review_photos FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_photos.review_id
      AND r.user_id = auth.uid()
    )
  );

-- Fix universities policies
DROP POLICY IF EXISTS "public_select_universities" ON universities;
CREATE POLICY "public_select_universities" ON universities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_universities" ON universities;
CREATE POLICY "auth_insert_universities" ON universities FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed universities
INSERT INTO universities (name, short_name, location, country, cover_image_url, image_url, slug, description)
VALUES
  ('University of Nairobi', 'UoN', 'Nairobi', 'Kenya', 'https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=400', 'uon', 'Kenya''s oldest and most prestigious university, founded in 1956.'),
  ('Kenyatta University', 'KU', 'Nairobi', 'Kenya', 'https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=400', 'ku', 'A leading public university known for education and science programs.'),
  ('Moi University', 'MU', 'Eldoret', 'Kenya', 'https://images.pexels.com/photos/159490/pexels-photo-159490.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/159490/pexels-photo-159490.jpeg?auto=compress&cs=tinysrgb&w=400', 'mu', 'A comprehensive university in the Rift Valley region of Kenya.'),
  ('Strathmore University', 'SU', 'Nairobi', 'Kenya', 'https://images.pexels.com/photos/2982449/pexels-photo-2982449.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/2982449/pexels-photo-2982449.jpeg?auto=compress&cs=tinysrgb&w=400', 'su', 'A leading private university known for business, law, and technology.'),
  ('Jomo Kenyatta University', 'JKUAT', 'Juja', 'Kenya', 'https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=400', 'jkuat', 'A science and technology focused university with a vibrant campus.')
;

-- Seed hostels
INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Lumumba Hall', 'male', 'One of the oldest male hostels on campus. 4-bed rooms with shared facilities.', 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'uon';

INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Mamlaka Hall', 'female', 'A modern female hostel with en-suite rooms and reliable hot water.', 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'uon';

INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Jevanjee Hall', 'mixed', 'Mixed hostel with spacious rooms, a common room, and good WiFi coverage.', 'https://images.pexels.com/photos/279746/pexels-photo-279746.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'uon';

INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Freitas Hall', 'female', 'A comfortable female hostel close to the main campus facilities.', 'https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'ku';

INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Njenga Hall', 'male', 'Affordable male hostel with access to sports grounds and cafeteria.', 'https://images.pexels.com/photos/3288100/pexels-photo-3288100.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'ku';

INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Pioneer Hall', 'mixed', 'Mixed hostel for first-year students. Walking distance to lecture halls.', 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'jkuat';

INSERT INTO hostels (university_id, name, type, description, cover_image_url)
SELECT id, 'Moi Hall A', 'male', 'Block-style male hostel with a central courtyard and study rooms.', 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM universities WHERE slug = 'mu';
