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
  "008_report_signatures.sql"
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
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'incidents'
            AND column_name IN (
              'report_hash', 'signature', 'signature_algorithm',
              'signature_public_key', 'signature_verified', 'signature_nonce'
            )
        ) AS incident_columns,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'anonymous_reports'
            AND column_name = 'linkability_scope'
        ) AS linkability_scope_present,
        (
          SELECT COUNT(*)::int
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'incident_signature_keys'
            AND column_name IN ('user_id', 'public_key_jwk', 'updated_at')
        ) AS key_table_columns
    `);
    const result = verification.rows[0];

    if (
      result.incident_columns !== 6 ||
      !result.linkability_scope_present ||
      result.key_table_columns !== 3
    ) {
      throw new Error("Migration ran, but signature schema verification failed.");
    }

    console.log("Report signature migration applied and verified.");
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
  console.error("Could not apply report signature migration:", error.message);
  process.exitCode = 1;
});
