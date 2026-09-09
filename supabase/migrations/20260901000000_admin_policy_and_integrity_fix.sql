/*
  Admin policy integrity fix

  Public and signed-in roles must use separate SELECT policies.  The admin
  helper is intentionally executable only by authenticated users, so combining
  `anon` and `authenticated` in policies that call it can break public reads.
*/

-- Anonymous visitors only see records intended for the public website.
DROP POLICY IF EXISTS "public_select_universities" ON public.universities;
CREATE POLICY "universities_read_public"
  ON public.universities FOR SELECT TO anon
  USING (status = 'active');
CREATE POLICY "universities_read_authenticated"
  ON public.universities FOR SELECT TO authenticated
  USING (status = 'active' OR is_admin());

DROP POLICY IF EXISTS "public_select_hostels" ON public.hostels;
CREATE POLICY "hostels_read_public"
  ON public.hostels FOR SELECT TO anon
  USING (status = 'active');
CREATE POLICY "hostels_read_authenticated"
  ON public.hostels FOR SELECT TO authenticated
  USING (status = 'active' OR is_admin());

DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
CREATE POLICY "reviews_read_public"
  ON public.reviews FOR SELECT TO anon
  USING (status = 'approved');
CREATE POLICY "reviews_read_authenticated"
  ON public.reviews FOR SELECT TO authenticated
  USING (status = 'approved' OR auth.uid() = user_id OR is_admin());

-- A hidden review's photos must not remain public through storage metadata.
DROP POLICY IF EXISTS "review_photos_select" ON public.review_photos;
CREATE POLICY "review_photos_read_public"
  ON public.review_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.id = review_photos.review_id
        AND reviews.status = 'approved'
    )
  );
CREATE POLICY "review_photos_read_authenticated"
  ON public.review_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.id = review_photos.review_id
        AND (reviews.status = 'approved' OR reviews.user_id = auth.uid() OR is_admin())
    )
  );
