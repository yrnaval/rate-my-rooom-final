/*
  Hostel AI Reports (cache)

  Stores one Gemini-generated analysis per hostel so the API is only
  called when needed. Writes happen only from the Edge Function
  (service role bypasses RLS). Public can read the cached report.
*/

CREATE TABLE IF NOT EXISTS hostel_ai_reports (
  hostel_id     uuid PRIMARY KEY REFERENCES hostels(id) ON DELETE CASCADE,
  report        jsonb NOT NULL,
  review_count  int   NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hostel_ai_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_hostel_ai_reports" ON hostel_ai_reports;
CREATE POLICY "public_select_hostel_ai_reports"
  ON hostel_ai_reports FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON hostel_ai_reports FROM anon, authenticated;
GRANT SELECT ON hostel_ai_reports TO anon, authenticated;
