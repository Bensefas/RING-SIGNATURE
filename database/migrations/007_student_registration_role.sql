INSERT INTO roles (role_id, role_name, description)
VALUES (1, 'STUDENT', 'Student user')
ON CONFLICT (role_id) DO UPDATE
SET role_name = EXCLUDED.role_name,
    description = EXCLUDED.description;