const pool = require("C:/UniversityIncidentSystem/server/config/db");

async function run() {
    try {
        console.log("\n=== INCIDENTS ===");

        let result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'incidents'
            ORDER BY ordinal_position
        `);

        console.table(result.rows);

        console.log("\n=== ROLES ===");

        result = await pool.query(`
            SELECT *
            FROM roles
            ORDER BY id
        `);

        console.table(result.rows);

        console.log("\n=== USERS ===");

        result = await pool.query(`
            SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.role_id,
                r.name AS role_name,
                u.is_active
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            ORDER BY u.id
        `);

        console.table(result.rows);

        console.log("\n=== INCIDENT ASSIGNMENTS ===");

        result = await pool.query(`
            SELECT *
            FROM incident_assignments
            ORDER BY id
        `);

        console.table(result.rows);

        console.log("\n=== STATUS TABLES ===");

        result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name ILIKE '%status%'
            ORDER BY table_name
        `);

        console.table(result.rows);

        console.log("\n=== ASSIGNMENT FOREIGN KEYS ===");

        result = await pool.query(`
            SELECT
                tc.constraint_name,
                kcu.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'incident_assignments'
            ORDER BY tc.constraint_name
        `);

        console.table(result.rows);

        await pool.end();

    } catch (error) {
        console.error("\nDATABASE ERROR:");
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

run();
