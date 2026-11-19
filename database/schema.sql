-- =====================================================
-- University Incident Transparency Reporting System
-- PostgreSQL Schema - Part 1 (Foundation)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- DROP TABLES (Development Only)
-- =====================================================

DROP TABLE IF EXISTS blockchain_transactions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS incident_feedback CASCADE;
DROP TABLE IF EXISTS incident_status_history CASCADE;
DROP TABLE IF EXISTS incident_assignments CASCADE;
DROP TABLE IF EXISTS incident_files CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS incident_statuses CASCADE;
DROP TABLE IF EXISTS incident_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizational_units CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =====================================================
-- ROLES
-- =====================================================

CREATE TABLE roles(
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ORGANIZATIONAL UNITS
-- =====================================================

CREATE TABLE organizational_units(
    unit_id SERIAL PRIMARY KEY,
    unit_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users(

    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    staff_student_id VARCHAR(50) UNIQUE,

    first_name VARCHAR(100) NOT NULL,

    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(150) UNIQUE NOT NULL,

    phone VARCHAR(20),

    password_hash TEXT NOT NULL,

    role_id INTEGER NOT NULL,

    unit_id INTEGER,

    is_active BOOLEAN DEFAULT TRUE,

    last_login TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_role
        FOREIGN KEY(role_id)
        REFERENCES roles(role_id),

    CONSTRAINT fk_unit
        FOREIGN KEY(unit_id)
        REFERENCES organizational_units(unit_id)

);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_single_admin
ON users (role_id)
WHERE role_id = 14;

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_users_role
ON users(role_id);

CREATE INDEX idx_users_unit
ON users(unit_id);

-- =====================================================
-- ANONYMOUS REPORTING REGISTRY
-- =====================================================

CREATE TABLE anonymous_public_keys(
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    key_algorithm VARCHAR(40) NOT NULL DEFAULT 'legacy-sha256',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    revoked_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anonymous_key_user
        FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_anonymous_key_status
ON anonymous_public_keys(status);

CREATE UNIQUE INDEX ux_anonymous_public_keys_active_key
ON anonymous_public_keys(public_key)
WHERE status = 'active' AND key_algorithm = 'LSAG-secp256k1-v1';

CREATE TABLE incident_signature_keys(
    user_id UUID PRIMARY KEY,
    public_key_jwk JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_signature_key_user
        FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- =====================================================
-- INCIDENT CATEGORIES
-- =====================================================

CREATE TABLE incident_categories(

    category_id SERIAL PRIMARY KEY,

    category_name VARCHAR(120) UNIQUE NOT NULL,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================================
-- INCIDENT STATUS
-- =====================================================

CREATE TABLE incident_statuses(

    status_id SERIAL PRIMARY KEY,

    status_name VARCHAR(80) UNIQUE NOT NULL,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================================
-- INCIDENTS
-- =====================================================

CREATE TABLE incidents(

    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_number VARCHAR(30) UNIQUE NOT NULL,

    reporter_id UUID NOT NULL,

    category_id INTEGER NOT NULL,

    current_status_id INTEGER NOT NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT NOT NULL,

    incident_location TEXT,

    incident_date TIMESTAMP,

    priority VARCHAR(20)
    CHECK(priority IN ('Low','Medium','High','Critical')),

    anonymous BOOLEAN DEFAULT FALSE,

    report_hash TEXT,

    signature TEXT,

    signature_algorithm VARCHAR(80),

    signature_public_key JSONB,

    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,

    signature_nonce VARCHAR(32),

    blockchain_hash TEXT,

    blockchain_tx_id TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reporter
        FOREIGN KEY(reporter_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_category
        FOREIGN KEY(category_id)
        REFERENCES incident_categories(category_id),

    CONSTRAINT fk_status
        FOREIGN KEY(current_status_id)
        REFERENCES incident_statuses(status_id)

);

CREATE TABLE anonymous_reports(
    anonymous_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL,
    user_id UUID NOT NULL,
    report_hash TEXT NOT NULL,
    ring_members JSONB NOT NULL DEFAULT '[]'::jsonb,
    signature TEXT NOT NULL,
    linkability_tag TEXT NOT NULL,
    linkability_scope TEXT NOT NULL,
    verification_result BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anonymous_report_incident
        FOREIGN KEY(incident_id)
        REFERENCES incidents(incident_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_anonymous_report_user
        FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_anonymous_report_hash
ON anonymous_reports(report_hash);

CREATE INDEX idx_anonymous_report_linkability
ON anonymous_reports(linkability_tag);

CREATE INDEX idx_anonymous_report_scope_linkability
ON anonymous_reports(linkability_scope, linkability_tag);

CREATE UNIQUE INDEX ux_incidents_signature_nonce
ON incidents(signature_nonce)
WHERE signature_nonce IS NOT NULL;

CREATE INDEX idx_incident_number
ON incidents(incident_number);

CREATE INDEX idx_incident_reporter
ON incidents(reporter_id);

CREATE INDEX idx_incident_status
ON incidents(current_status_id);

-- =====================================================
-- INCIDENT FILES
-- =====================================================

CREATE TABLE incident_files(

    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL,

    uploaded_by UUID,

    original_filename VARCHAR(255),

    stored_filename VARCHAR(255),

    mime_type VARCHAR(120),

    file_size BIGINT,

    ipfs_cid TEXT,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_file_incident
        FOREIGN KEY(incident_id)
        REFERENCES incidents(incident_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_file_user
        FOREIGN KEY(uploaded_by)
        REFERENCES users(user_id)

);
-- =====================================================
-- INCIDENT ASSIGNMENTS
-- =====================================================

CREATE TABLE incident_assignments (

    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL,

    assigned_unit_id INTEGER NOT NULL,

    assigned_by UUID NOT NULL,

    assigned_to UUID,

    remarks TEXT,

    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(incident_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_unit
        FOREIGN KEY (assigned_unit_id)
        REFERENCES organizational_units(unit_id),

    CONSTRAINT fk_assignment_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(user_id),

    CONSTRAINT fk_assignment_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id)
);

-- =====================================================
-- INCIDENT STATUS HISTORY
-- =====================================================

CREATE TABLE incident_status_history (

    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL,

    status_id INTEGER NOT NULL,

    changed_by UUID NOT NULL,

    remarks TEXT,

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_history_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(incident_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_history_status
        FOREIGN KEY (status_id)
        REFERENCES incident_statuses(status_id),

    CONSTRAINT fk_history_user
        FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
);

-- =====================================================
-- INCIDENT FEEDBACK
-- =====================================================

CREATE TABLE incident_feedback (

    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL,

    user_id UUID NOT NULL,

    feedback TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_feedback_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(incident_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (

    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE audit_logs (

    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    action VARCHAR(255) NOT NULL,

    entity_name VARCHAR(100),

    entity_id UUID,

    ip_address VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =====================================================
-- BLOCKCHAIN TRANSACTIONS
-- =====================================================

CREATE TABLE blockchain_transactions (

    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL,

    transaction_hash TEXT NOT NULL,

    block_number BIGINT,

    channel_name VARCHAR(100),

    chaincode_name VARCHAR(100),

    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_blockchain_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(incident_id)
        ON DELETE CASCADE
);