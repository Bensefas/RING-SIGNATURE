CREATE TABLE IF NOT EXISTS incident_evidence_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(user_id),
  request_text TEXT NOT NULL CHECK (char_length(btrim(request_text)) BETWEEN 1 AND 4000),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'responded', 'closed')),
  due_at TIMESTAMP,
  reporter_response TEXT,
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_requests_incident_created
  ON incident_evidence_requests(incident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_requests_pending
  ON incident_evidence_requests(status, due_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS incident_evidence_request_files (
  request_id UUID NOT NULL REFERENCES incident_evidence_requests(request_id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES incident_files(file_id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, file_id)
);

SELECT setval(
  pg_get_serial_sequence('incident_statuses', 'status_id'),
  COALESCE((SELECT MAX(status_id) FROM incident_statuses), 1),
  EXISTS (SELECT 1 FROM incident_statuses)
);

INSERT INTO incident_statuses (status_name, description)
SELECT candidate.status_name, candidate.description
FROM (VALUES
  ('Awaiting Reporter Response', 'The reporter has been asked to provide more information or evidence.'),
  ('Referred', 'The incident has been referred to another responsible unit.'),
  ('Reopened', 'A previously resolved or rejected incident has been reopened.')
) AS candidate(status_name, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM incident_statuses existing
  WHERE LOWER(existing.status_name) = LOWER(candidate.status_name)
);
