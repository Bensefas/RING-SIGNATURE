-- Align application-only fields with the UUID-based foundation schema.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department VARCHAR(150),
  ADD COLUMN IF NOT EXISTS faculty VARCHAR(150);

ALTER TABLE incident_files
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

ALTER TABLE incident_status_history
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(80),
  ADD COLUMN IF NOT EXISTS new_status VARCHAR(80),
  ADD COLUMN IF NOT EXISTS comment TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT;

ALTER TABLE incident_status_history
  ALTER COLUMN status_id DROP NOT NULL;

ALTER TABLE incident_assignments
  ADD COLUMN IF NOT EXISTS assignment_note TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE incident_assignments
  ALTER COLUMN assigned_unit_id DROP NOT NULL;

ALTER TABLE incident_feedback
  ADD COLUMN IF NOT EXISTS visible_to_reporter BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS details TEXT;

CREATE TABLE IF NOT EXISTS incident_advisories (
  advisory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id),
  advisory TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incident_advisories_incident
  ON incident_advisories(incident_id);