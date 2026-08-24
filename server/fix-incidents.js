const pool = require("C:/UniversityIncidentSystem/server/config/db");

const sql = `
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS current_status_id INTEGER,
    ADD COLUMN IF NOT EXISTS reported_by UUID,
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS category_id INTEGER,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS incident_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS incident_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS blockchain_hash TEXT,
    ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT,
    ADD COLUMN IF NOT EXISTS incident_number VARCHAR(100);
`;

pool.query(sql)
    .then(() => {
        console.log("SUCCESS - incident columns created.");
        return pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'incidents'
            ORDER BY ordinal_position;
        `);
    })
    .then(result => {
        console.log("CURRENT INCIDENT COLUMNS:");
        console.table(result.rows);
        return pool.end();
    })
    .catch(error => {
        console.error("DATABASE ERROR:", error.message);
        pool.end();
        process.exit(1);
    });
