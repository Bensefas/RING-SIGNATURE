CREATE TABLE IF NOT EXISTS anonymous_public_keys(
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    revoked_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anonymous_reports(
    anonymous_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL,
    user_id UUID NOT NULL,
    report_hash TEXT NOT NULL,
    ring_members JSONB NOT NULL DEFAULT '[]'::jsonb,
    signature TEXT NOT NULL,
    linkability_tag TEXT NOT NULL,
    verification_result BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anonymous_public_keys_status
ON anonymous_public_keys(status);

CREATE INDEX IF NOT EXISTS idx_anonymous_reports_hash
ON anonymous_reports(report_hash);

CREATE INDEX IF NOT EXISTS idx_anonymous_reports_linkability
ON anonymous_reports(linkability_tag);
