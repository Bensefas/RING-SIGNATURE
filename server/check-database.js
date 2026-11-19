const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { Client } = require("pg");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "university_incident_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
};

const requiredTables = [
  "roles",
  "organizational_units",
  "users",
  "incident_categories",
  "incident_statuses",
  "incidents",
  "incident_files",
  "incident_assignments",
  "incident_status_history",
  "incident_feedback",
  "notifications",
  "audit_logs",
  "blockchain_transactions",
  "incident_advisories",
  "anonymous_public_keys",
  "anonymous_reports",
  "incident_evidence_requests",
  "incident_evidence_request_files",
];

const requiredColumns = [
  ["users", "department"],
  ["users", "faculty"],
  ["incident_files", "file_hash"],
  ["incident_status_history", "previous_status"],
  ["incident_status_history", "new_status"],
  ["incident_status_history", "comment"],
  ["incident_status_history", "blockchain_tx_id"],
  ["incident_assignments", "assignment_note"],
  ["incident_assignments", "completed_at"],
  ["incident_feedback", "visible_to_reporter"],
  ["audit_logs", "details"],
  ["incidents", "incident_number"],
];

async function getMissingDatabaseNames() {
  const client = new Client({ ...config, database: "postgres" });
  try {
    await client.connect();
    const result = await client.query(
      "SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname"
    );
    console.log("Available databases:");
    for (const row of result.rows) console.log(`  ${row.datname}`);
  } catch (error) {
    console.error(`Could not list databases: ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const client = new Client(config);
  try {
    await client.connect();
  } catch (error) {
    await client.end().catch(() => {});
    if (error.code === "3D000") {
      console.error(`Configured database does not exist: ${config.database}`);
      await getMissingDatabaseNames();
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  try {
    const connection = await client.query(
      "SELECT current_database() AS database, current_user AS username"
    );
    console.log(`Connected: ${connection.rows[0].username}@${connection.rows[0].database}`);

    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'"
    );
    const tables = new Set(tablesResult.rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((table) => !tables.has(table));
    console.log(`Required tables: ${requiredTables.length - missingTables.length}/${requiredTables.length} present`);
    if (missingTables.length) console.log(`Missing tables: ${missingTables.join(", ")}`);

    if (missingTables.length) {
      process.exitCode = 1;
      return;
    }

    const columnsResult = await client.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()"
    );
    const columns = new Set(
      columnsResult.rows.map((row) => `${row.table_name}.${row.column_name}`)
    );
    const missingColumns = requiredColumns
      .filter(([table, column]) => !columns.has(`${table}.${column}`))
      .map(([table, column]) => `${table}.${column}`);
    console.log(`Migration columns: ${requiredColumns.length - missingColumns.length}/${requiredColumns.length} present`);
    if (missingColumns.length) console.log(`Missing columns: ${missingColumns.join(", ")}`);

    const indexResult = await client.query(
      "SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'ux_users_single_admin'"
    );
    console.log(`Single-admin unique index: ${indexResult.rowCount ? "present" : "MISSING"}`);

    const checks = await client.query(`
      SELECT 'orphan users without role' AS check_name, count(*)::int AS issues FROM users u LEFT JOIN roles r USING (role_id) WHERE r.role_id IS NULL
      UNION ALL SELECT 'orphan incident references', count(*)::int FROM incidents i LEFT JOIN users u ON u.user_id=i.reporter_id LEFT JOIN incident_categories c USING (category_id) LEFT JOIN incident_statuses s ON s.status_id=i.current_status_id WHERE u.user_id IS NULL OR c.category_id IS NULL OR s.status_id IS NULL
      UNION ALL SELECT 'orphan incident files', count(*)::int FROM incident_files f LEFT JOIN incidents i USING (incident_id) WHERE i.incident_id IS NULL
      UNION ALL SELECT 'orphan assignments', count(*)::int FROM incident_assignments a LEFT JOIN incidents i USING (incident_id) LEFT JOIN users u ON u.user_id=a.assigned_by WHERE i.incident_id IS NULL OR u.user_id IS NULL
      UNION ALL SELECT 'orphan status history', count(*)::int FROM incident_status_history h LEFT JOIN incidents i USING (incident_id) LEFT JOIN users u ON u.user_id=h.changed_by WHERE i.incident_id IS NULL OR u.user_id IS NULL
      UNION ALL SELECT 'duplicate incident numbers', count(*)::int FROM (SELECT incident_number FROM incidents GROUP BY incident_number HAVING count(*) > 1) d
      UNION ALL SELECT 'multiple system admins (role_id 14)', greatest(count(*) - 1, 0)::int FROM users WHERE role_id=14
      UNION ALL SELECT 'missing required statuses', count(*)::int FROM (VALUES (8,'Action Taken'),(9,'Rejected')) expected(status_id,status_name) WHERE NOT EXISTS (SELECT 1 FROM incident_statuses s WHERE s.status_id=expected.status_id AND s.status_name=expected.status_name)
      UNION ALL SELECT 'missing evidence workflow statuses', count(*)::int FROM (VALUES ('Awaiting Reporter Response'),('Referred'),('Reopened')) expected(status_name) WHERE NOT EXISTS (SELECT 1 FROM incident_statuses s WHERE LOWER(s.status_name)=LOWER(expected.status_name))
    `);

    let hasIssues = missingColumns.length > 0 || !indexResult.rowCount;
    for (const row of checks.rows) {
      console.log(`${row.issues === 0 ? "OK" : "ISSUE"}: ${row.check_name} (${row.issues})`);
      if (row.issues !== 0) hasIssues = true;
    }

    if (hasIssues) process.exitCode = 1;
    else console.log("Database check passed.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Database check failed: ${error.message}`);
  process.exitCode = 1;
});