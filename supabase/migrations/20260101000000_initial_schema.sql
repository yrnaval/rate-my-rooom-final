/*
# Rate My Room - Initial Base Schema

Creates the base tables, constraints, indexes, and RLS policies for RateMyRoom
prior to the extension migrations.

## Tables
- `universities`: Base university records
- `reviews`: Base university reviews with category ratings
- `review_photos`: Photos associated with reviews

## Compatibility
- Migration 20260617064411 extends universities, creates hostels, links reviews, and aliases photo_url.
- Migration 20260617065128 relaxes NOT NULL constraints on university_id, title, noise, reviewer_name, and body.
- Subsequent migrations handle admin panel, moderation, hardening, and additional ratings.
*/

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══ 1. UNIVERSITIES TABLE ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS universities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  location    text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  image_url   text,
  logo_url    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_universities_slug ON universities(slug);

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_universities" ON universities;
CREATE POLICY "public_select_universities"
  ON universities FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_insert_universities" ON universities;
CREATE POLICY "auth_insert_universities"
  ON universities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══ 2. REVIEWS TABLE ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name   text NOT NULL,
  reviewer_avatar text,
  title           text NOT NULL,
  body            text NOT NULL,
  cleanliness     int2 NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
  wifi            int2 NOT NULL CHECK (wifi BETWEEN 1 AND 5),
  food            int2 NOT NULL CHECK (food BETWEEN 1 AND 5),
  water           int2 NOT NULL CHECK (water BETWEEN 1 AND 5),
  security        int2 NOT NULL CHECK (security BETWEEN 1 AND 5),
  noise           int2 NOT NULL CHECK (noise BETWEEN 1 AND 5),
  overall         numeric NOT NULL CHECK (overall >= 1 AND overall <= 5),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_university_id ON reviews(university_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_reviews" ON reviews;
CREATE POLICY "public_select_reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
CREATE POLICY "auth_insert_reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_own_reviews" ON reviews;
CREATE POLICY "auth_update_own_reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_reviews" ON reviews;
CREATE POLICY "auth_delete_reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══ 3. REVIEW_PHOTOS TABLE ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS review_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON review_photos(review_id);

ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_review_photos" ON review_photos;
CREATE POLICY "public_select_review_photos"
  ON review_photos FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_insert_review_photos" ON review_photos;
CREATE POLICY "auth_insert_review_photos"
  ON review_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_review_photos" ON review_photos;
CREATE POLICY "auth_delete_review_photos"
  ON review_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_photos.review_id
      AND r.user_id = auth.uid()
    )
  );

-- ═══ 4. BASE PERMISSIONS ══════════════════════════════════════════
GRANT SELECT ON universities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON universities TO authenticated;

GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reviews TO authenticated;

GRANT SELECT ON review_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON review_photos TO authenticated;
