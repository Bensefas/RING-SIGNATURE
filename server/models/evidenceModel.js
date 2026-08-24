const pool = require("../config/db");

const saveEvidence = async (data) => {

    const result = await pool.query(
        `
        INSERT INTO incident_files
        (
            incident_id,
            uploaded_by,
            original_filename,
            stored_filename,
            mime_type,
            file_size,
            ipfs_cid
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *;
        `,
        [
            data.incident_id,
            data.uploaded_by,
            data.original_filename,
            data.stored_filename,
            data.mime_type,
            data.file_size,
            data.ipfs_cid
        ]
    );

    return result.rows[0];
};

module.exports = {
    saveEvidence
};