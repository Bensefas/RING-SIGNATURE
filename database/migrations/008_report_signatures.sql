ALTER TABLE anonymous_public_keys
  ADD COLUMN IF NOT EXISTS key_algorithm VARCHAR(40) NOT NULL DEFAULT 'legacy-sha256';

CREATE UNIQUE INDEX IF NOT EXISTS ux_anonymous_public_keys_active_key
  ON anonymous_public_keys(public_key)
  WHERE status = 'active' AND key_algorithm = 'LSAG-secp256k1-v1';

CREATE TABLE IF NOT EXISTS incident_signature_keys (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  public_key_jwk JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS report_hash TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS signature_algorithm VARCHAR(80),
  ADD COLUMN IF NOT EXISTS signature_public_key JSONB,
  ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signature_nonce VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS ux_incidents_signature_nonce
  ON incidents(signature_nonce)
  WHERE signature_nonce IS NOT NULL;

ALTER TABLE anonymous_reports
  ADD COLUMN IF NOT EXISTS linkability_scope TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_anonymous_report_scope_linkability
  ON anonymous_reports(linkability_scope, linkability_tag);

SELECT setval(
  pg_get_serial_sequence('incident_statuses', 'status_id'),
  COALESCE((SELECT MAX(status_id) FROM incident_statuses), 1),
  EXISTS (SELECT 1 FROM incident_statuses)
);

INSERT INTO incident_statuses (status_name)
VALUES ('SUBMITTED')
ON CONFLICT (status_name) DO NOTHING;
