-- Replace the timestamp/random incident ID default with a collision-safe UUID-backed ID.
ALTER TABLE incidents
  ALTER COLUMN incident_id SET DEFAULT ('INC-' || REPLACE(gen_random_uuid()::text, '-', ''));
