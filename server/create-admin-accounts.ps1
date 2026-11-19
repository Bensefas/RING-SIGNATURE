param(
  [string]$DbHost = "localhost",
  [int]$DbPort = 5432,
  [string]$DbName = "university_incident_db",
  [string]$DbUser = "postgres",
  [string]$DbPassword = "benjamin",
  [string]$AccountPassword = "password123"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql was not found. Install PostgreSQL or add its bin folder to PATH."
}

if ($DbPassword) {
  $env:PGPASSWORD = $DbPassword
}

$sql = @"
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO `$do`$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') THEN
    ALTER TABLE users RENAME COLUMN id TO user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_id') THEN
    ALTER TABLE roles RENAME COLUMN id TO role_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_name') THEN
    ALTER TABLE roles RENAME COLUMN name TO role_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'matric_staff_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'staff_student_id') THEN
    ALTER TABLE users RENAME COLUMN matric_staff_id TO staff_student_id;
  END IF;
END `$do`$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(150), ADD COLUMN IF NOT EXISTS faculty VARCHAR(150);

INSERT INTO roles (role_id, role_name)
VALUES (2, 'STAFF / ICT'), (5, 'HOD'), (10, 'GUIDANCE'), (11, 'CLINIC'), (12, 'SUG'), (14, 'ADMIN')
ON CONFLICT (role_id) DO UPDATE SET role_name = EXCLUDED.role_name;

DELETE FROM users WHERE role_id = 14 AND email <> 'admin@university.edu';

INSERT INTO users (staff_student_id, first_name, last_name, email, password_hash, role_id, is_active)
VALUES
  ('HOD-001', 'Head', 'Of Department', 'hod@university.edu', crypt('$($AccountPassword)', gen_salt('bf')), 5, TRUE),
  ('SUG-001', 'Student', 'Union', 'sug@university.edu', crypt('$($AccountPassword)', gen_salt('bf')), 12, TRUE),
  ('CLINIC-001', 'Clinic', 'Officer', 'clinic@university.edu', crypt('$($AccountPassword)', gen_salt('bf')), 11, TRUE),
  ('ICT-001', 'ICT', 'Administrator', 'ict@university.edu', crypt('$($AccountPassword)', gen_salt('bf')), 2, TRUE),
  ('ADMIN-001', 'System', 'Administrator', 'admin@university.edu', crypt('$($AccountPassword)', gen_salt('bf')), 14, TRUE)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    is_active = TRUE;
"@

& psql --host=$DbHost --port=$DbPort --username=$DbUser --dbname=$DbName --set=ON_ERROR_STOP=1 --command=$sql
if ($LASTEXITCODE -ne 0) {
  throw "Database setup failed with exit code $LASTEXITCODE."
}

Write-Host "Admin accounts are ready. Password: $AccountPassword"
Write-Host "admin@university.edu, hod@university.edu, sug@university.edu, clinic@university.edu, ict@university.edu"
