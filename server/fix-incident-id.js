const pool = require("C:/UniversityIncidentSystem/server/config/db");

async function run() {
    try {
        const result = await pool.query(`
            SELECT
                data_type,
                column_default,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'incidents'
              AND column_name = 'incident_id'
        `);

        console.table(result.rows);

        if (result.rows.length === 0) {
            throw new Error("incident_id column does not exist");
        }

        const type = result.rows[0].data_type;

        if (type === "uuid") {
            await pool.query(`
                CREATE EXTENSION IF NOT EXISTS pgcrypto;

                ALTER TABLE incidents
                ALTER COLUMN incident_id
                SET DEFAULT gen_random_uuid();
            `);

            console.log("FIXED: incident_id now auto-generates UUID.");
        } else {
            await pool.query(`
                ALTER TABLE incidents
                ALTER COLUMN incident_id
                SET DEFAULT (
                    'INC-' ||
                    TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') ||
                    '-' ||
                    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
                );
            `);

            console.log("FIXED: incident_id now auto-generates an incident number.");
        }

        await pool.end();
    } catch (error) {
        console.error("ERROR:", error.message);
        await pool.end();
        process.exit(1);
    }
}

run();
