-- Generate a readable, collision-safe text number without changing the UUID primary key.
ALTER TABLE incidents
  ALTER COLUMN incident_number SET DEFAULT ('INC-' || REPLACE(gen_random_uuid()::text, '-', ''));
