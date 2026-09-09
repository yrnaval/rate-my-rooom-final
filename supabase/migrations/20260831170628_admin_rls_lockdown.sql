/*
# Admin RLS — Lock Down Universities, Hostels, Review Moderation

## Summary
Replaces overly permissive RLS policies on `universities` and `hostels` so only admins
can INSERT/UPDATE/DELETE. Public read remains open. Reviews get admin-only UPDATE on the
`status` column for moderation, while users keep ownership of their own review content.

## Changes Per Table

### universities
- SELECT: public (anon + authenticated) — unchanged
- INSERT/UPDATE/DELETE: admin only (was: any authenticated user)

### hostels
- SELECT: public — unchanged
- INSERT/UPDATE/DELETE: admin only

### reviews
- SELECT: anon sees approved only; authenticated sees approved + own; admin sees all
- INSERT: authenticated, owner-scoped
- UPDATE: users can update own review content columns; admins can update status
- DELETE: owner or admin

### review_photos
- SELECT: public
- INSERT: must own the review
- DELETE: owner or admin

## Security Notes
1. `is_admin()` (SECURITY DEFINER) used in all admin policies
2. Column-level GRANT/REVOKE on reviews ensures users cannot change status
3. Reviews SELECT uses OR: approved OR own OR admin
*/

-- ═══ UNIVERSITIES ═══════════════════════════
DROP POLICY IF EXISTS "auth_insert_universities" ON universities;
DROP POLICY IF EXISTS "public_select_universities" ON universities;

CREATE POLICY "public_select_universities"
  ON universities FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_insert_universities"
  ON universities FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_universities"
  ON universities FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_universities"
  ON universities FOR DELETE TO authenticated
  USING (is_admin());

-- ═══ HOSTELS ═══════════════════════════════
DROP POLICY IF EXISTS "auth_insert_hostels" ON hostels;
DROP POLICY IF EXISTS "public_read_hostels" ON hostels;

CREATE POLICY "public_select_hostels"
  ON hostels FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_insert_hostels"
  ON hostels FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_hostels"
  ON hostels FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_hostels"
  ON hostels FOR DELETE TO authenticated
  USING (is_admin());

-- ═══ REVIEWS ═══════════════════════════════
DROP POLICY IF EXISTS "public_select_reviews" ON reviews;
DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
DROP POLICY IF EXISTS "auth_update_own_reviews" ON reviews;
DROP POLICY IF EXISTS "auth_delete_reviews" ON reviews;

CREATE POLICY "reviews_select"
  ON reviews FOR SELECT TO anon, authenticated
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR is_admin()
  );

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own_or_admin"
  ON reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "reviews_delete_own_or_admin"
  ON reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Column-level: users can only update content columns, not status
REVOKE UPDATE ON reviews FROM authenticated;
GRANT UPDATE (cleanliness, wifi, food, water, security, value, overall, body, title, noise, stay_period, reviewer_name, reviewer_avatar, user_name, user_avatar)
  ON reviews TO authenticated;

-- ═══ REVIEW_PHOTOS ════════════════════════
DROP POLICY IF EXISTS "public_select_review_photos" ON review_photos;
DROP POLICY IF EXISTS "auth_insert_review_photos" ON review_photos;
DROP POLICY IF EXISTS "auth_delete_review_photos" ON review_photos;

CREATE POLICY "review_photos_select"
  ON review_photos FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "review_photos_insert_own"
  ON review_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_photos.review_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "review_photos_delete_own_or_admin"
  ON review_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_photos.review_id
      AND (r.user_id = auth.uid() OR is_admin())
    )
  );