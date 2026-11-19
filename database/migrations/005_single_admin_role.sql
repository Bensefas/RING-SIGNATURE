-- Keep only one system administrator record and lock the role to a single row.
WITH ranked_admins AS (
    SELECT
        user_id,
        ROW_NUMBER() OVER (
            ORDER BY created_at ASC, user_id ASC
        ) AS row_num
    FROM users
    WHERE role_id = 14
)
DELETE FROM users
WHERE user_id IN (
    SELECT user_id
    FROM ranked_admins
    WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_single_admin
ON users (role_id)
WHERE role_id = 14;
