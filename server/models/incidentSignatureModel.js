const pool = require("../config/db");

const registerPublicKey = async ({ userId, publicKey }) => {
  const result = await pool.query(
    `INSERT INTO incident_signature_keys (user_id, public_key_jwk, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET public_key_jwk = EXCLUDED.public_key_jwk,
                   updated_at = NOW()
     RETURNING public_key_jwk`,
    [userId, JSON.stringify(publicKey)]
  );
  return result.rows[0]?.public_key_jwk || null;
};

const getPublicKey = async ({ userId }) => {
  const result = await pool.query(
    `SELECT public_key_jwk
     FROM incident_signature_keys
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.public_key_jwk || null;
};

module.exports = { registerPublicKey, getPublicKey };
