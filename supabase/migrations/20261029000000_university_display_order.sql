/*
  # Add display_order to universities and atomic reordering function

  1. Adds `display_order` integer column to `universities`.
  2. Assigns existing universities a deterministic initial order (name, then id).
  3. Indexes `display_order` for public listing sorts.
  4. Sets display_order for new inserts when omitted.
  5. Creates `update_universities_order(uuid[])` so admins can persist a full order in one transaction.

  Public SELECT policies already expose university rows (including this column).
  UPDATE remains restricted to admins via existing `admin_update_universities`.
  The reorder function is SECURITY DEFINER and still requires `is_admin()`.
*/

-- 1. Add the column.  It is deliberately normalized below before constraints
--    are applied, so a partially applied earlier attempt can also recover safely.
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS display_order integer;

-- 2. Give current rows a total, deterministic order.  Valid saved positions are
--    preserved if this script is run again; missing, zero, negative, or duplicate
--    positions are normalized in one pass.
DO $$
DECLARE
  v_total integer;
  v_valid integer;
  v_distinct integer;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE display_order > 0),
    count(DISTINCT display_order) FILTER (WHERE display_order > 0)
  INTO v_total, v_valid, v_distinct
  FROM public.universities;

  IF v_total <> v_valid OR v_total <> v_distinct THEN
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY
            CASE WHEN display_order > 0 THEN 0 ELSE 1 END,
            display_order ASC NULLS LAST,
            name ASC,
            id ASC
        )::integer AS position
      FROM public.universities
    )
    UPDATE public.universities u
    SET display_order = ranked.position
    FROM ranked
    WHERE u.id = ranked.id;
  END IF;
END $$;

ALTER TABLE public.universities
  ALTER COLUMN display_order SET NOT NULL,
  ALTER COLUMN display_order SET DEFAULT 0;

-- 3. Unique, indexed positions keep public sorts deterministic and make any
--    out-of-band update fail rather than leaving the list inconsistent.
CREATE UNIQUE INDEX IF NOT EXISTS universities_display_order_unique
  ON public.universities (display_order ASC);

-- 4. Assign the next position for inserts that omit display_order.
CREATE OR REPLACE FUNCTION public.set_university_display_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
    LOCK TABLE public.universities IN SHARE ROW EXCLUSIVE MODE;
    SELECT COALESCE(MAX(display_order), 0) + 1
    INTO NEW.display_order
    FROM public.universities;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_universities_display_order ON public.universities;
CREATE TRIGGER trg_universities_display_order
BEFORE INSERT ON public.universities
FOR EACH ROW
EXECUTE FUNCTION public.set_university_display_order();

REVOKE ALL ON FUNCTION public.set_university_display_order() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_university_display_order() FROM anon;

-- 5. Atomic reorder function (admin only)
CREATE OR REPLACE FUNCTION public.update_universities_order(ordered_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_order int := 1;
  v_count int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can reorder universities.';
  END IF;

  IF ordered_ids IS NULL OR COALESCE(array_length(ordered_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'ordered_ids cannot be empty';
  END IF;

  IF (SELECT count(*) FROM unnest(ordered_ids) AS t(id))
     <> (SELECT count(DISTINCT t.id) FROM unnest(ordered_ids) AS t(id)) THEN
    RAISE EXCEPTION 'ordered_ids contains duplicates';
  END IF;

  -- Serialize both reorders and inserts before validating the submitted list.
  LOCK TABLE public.universities IN EXCLUSIVE MODE;

  SELECT count(*) INTO v_count FROM public.universities;
  IF v_count <> array_length(ordered_ids, 1) THEN
    RAISE EXCEPTION 'ordered_ids must include every university';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ordered_ids) AS t(id)
    LEFT JOIN public.universities u ON u.id = t.id
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ordered_ids contains unknown university ids';
  END IF;

  -- Two-phase update avoids colliding with existing positions mid-transaction
  FOREACH v_id IN ARRAY ordered_ids LOOP
    UPDATE public.universities
    SET display_order = -v_order
    WHERE id = v_id;
    v_order := v_order + 1;
  END LOOP;

  UPDATE public.universities
  SET display_order = abs(display_order)
  WHERE display_order < 0;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_universities_order(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_universities_order(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_universities_order(uuid[]) TO authenticated;
