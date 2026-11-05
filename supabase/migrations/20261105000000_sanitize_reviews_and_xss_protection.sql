/*
  # XSS Prevention & Review Sanitization Server-Side Trigger

  1. Reviews Sanitization:
     - Trims whitespace from review body, reviewer name, and stay period.
     - Strips <script>...</script> tags and embedded content.
     - Strips '<' and '>' characters to prevent tag injection.
     - Enforces max length of 500 characters for reviews on insert and update.
  2. Check Constraint:
     - Enforces reviews body cannot exceed 500 characters.
*/

CREATE OR REPLACE FUNCTION public.sanitize_review_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Trim whitespace
  NEW.body := trim(COALESCE(NEW.body, ''));

  -- 2. Strip script tags and content (case-insensitive)
  NEW.body := regexp_replace(NEW.body, '<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', 'gi');

  -- 3. Strip < and > characters
  NEW.body := regexp_replace(NEW.body, '[<>]', '', 'g');

  -- Re-trim after stripping
  NEW.body := trim(NEW.body);

  -- 4. Enforce max length of 500 characters
  IF length(NEW.body) > 500 THEN
    NEW.body := substr(NEW.body, 1, 500);
  END IF;

  -- 5. Sanitize stay_period if present
  IF NEW.stay_period IS NOT NULL THEN
    NEW.stay_period := trim(regexp_replace(regexp_replace(NEW.stay_period, '<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', 'gi'), '[<>]', '', 'g'));
    IF length(NEW.stay_period) > 100 THEN
      NEW.stay_period := substr(NEW.stay_period, 1, 100);
    END IF;
  END IF;

  -- 6. Sanitize reviewer_name if present
  IF NEW.reviewer_name IS NOT NULL THEN
    NEW.reviewer_name := trim(regexp_replace(regexp_replace(NEW.reviewer_name, '<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', 'gi'), '[<>]', '', 'g'));
    IF length(NEW.reviewer_name) > 100 THEN
      NEW.reviewer_name := substr(NEW.reviewer_name, 1, 100);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_review ON public.reviews;
CREATE TRIGGER trg_sanitize_review
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_review_content();

-- Add check constraint for max 500 characters on body
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_body_max_length;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_body_max_length CHECK (body IS NULL OR length(body) <= 500);

