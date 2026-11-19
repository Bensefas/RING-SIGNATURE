require("dotenv").config();

const { Pool } = require("pg");

const config = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "university_incident_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
};

console.log({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    passwordConfigured: Boolean(config.password),
});

const pool = new Pool(config);

pool.on("connect", () => {
    console.log("✅ PostgreSQL Connected");
});

pool.on("error", (err) => {
    console.error("Database Error:", err.message);
});

module.exports = pool;