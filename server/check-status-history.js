const pool = require("C:/UniversityIncidentSystem/server/config/db");

async function run() {
    try {
        const result = await pool.query(`
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'incident_status_history'
            ORDER BY ordinal_position
        `);

        console.table(result.rows);

        await pool.end();
    } catch (error) {
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

run();
