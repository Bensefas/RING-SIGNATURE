const pool = require("C:/UniversityIncidentSystem/server/config/db");

pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'incident_assignments'
    ORDER BY ordinal_position
`)
.then(result => {
    console.table(result.rows);
    return pool.end();
})
.catch(error => {
    console.error(error);
    return pool.end();
});
