
/*
# Fix reviews table constraints

The original reviews table has NOT NULL on university_id, title, and noise
that conflict with the hostel-centric review model. Making these nullable.
*/

ALTER TABLE reviews ALTER COLUMN university_id DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN title DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN noise DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN reviewer_name DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN body DROP NOT NULL;
