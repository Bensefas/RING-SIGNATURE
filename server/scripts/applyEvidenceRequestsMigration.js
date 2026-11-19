require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "university_incident_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  connectionTimeoutMillis: 10000,
});

const migrationPath = path.resolve(
  __dirname,
  "..",
  "..",
  "database",
  "migrations",
  "009_evidence_requests.sql"
);

async function applyMigration() {
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(migrationSql);
    await client.query("COMMIT");

    const verification = await client.query(`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name IN (
              'incident_evidence_requests',
              'incident_evidence_request_files'
            )
        ) AS request_tables,
        (
          SELECT COUNT(*)::int
          FROM incident_statuses
          WHERE LOWER(status_name) IN (
            'awaiting reporter response',
            'referred',
            'reopened'
          )
        ) AS workflow_statuses
    `);
    const result = verification.rows[0];

    if (result.request_tables !== 2 || result.workflow_statuses !== 3) {
      throw new Error("Migration ran, but evidence-request schema verification failed.");
    }

    console.log("Evidence-request migration applied and verified.");
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Migration rollback failed:", rollbackError.message);
      }
    }
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applyMigration().catch((error) => {
  console.error("Could not apply evidence-request migration:", error.message);
  process.exitCode = 1;
});
