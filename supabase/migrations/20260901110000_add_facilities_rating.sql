/*
  Add Facilities Rating Category

  Adds a 'facilities' rating column to the reviews table to support
  the 7th rating category: Facilities (laundry, common areas, gym, etc.)
*/

-- Add facilities column to reviews table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'facilities'
  ) THEN
    ALTER TABLE reviews ADD COLUMN facilities int2 CHECK (facilities BETWEEN 1 AND 5);
  END IF;
END $$;

-- Add index for facilities queries
CREATE INDEX IF NOT EXISTS idx_reviews_facilities ON reviews(facilities);

-- Update column-level grants to include facilities
REVOKE UPDATE ON reviews FROM authenticated;
GRANT UPDATE (
  cleanliness, wifi, food, water, security, value, facilities, overall,
  body, title, noise, stay_period, reviewer_name, reviewer_avatar, user_name, user_avatar
) ON reviews TO authenticated;

-- Add avg_facilities to hostels table for cached calculations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hostels' AND column_name = 'avg_facilities'
  ) THEN
    ALTER TABLE hostels ADD COLUMN avg_facilities numeric(3,2);
  END IF;
END $$;