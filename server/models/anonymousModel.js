const pool = require("../config/db");

const registerPublicKey = async ({ userId, publicKey, status = "active" }) => {
  if (!userId || !publicKey) {
    throw new Error("User ID and public key are required.");
  }

  const result = await pool.query(
    `INSERT INTO anonymous_public_keys (user_id, public_key, key_algorithm, status, created_at, updated_at)
     VALUES ($1, $2, 'LSAG-secp256k1-v1', $3, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET public_key = EXCLUDED.public_key,
                   key_algorithm = EXCLUDED.key_algorithm,
                   status = EXCLUDED.status,
                   updated_at = NOW()
     RETURNING *`,
    [userId, publicKey, status]
  );

  return result.rows[0];
};

const getEligiblePublicKeys = async () => {
  const result = await pool.query(
    `SELECT anonymous_key.public_key
     FROM anonymous_public_keys anonymous_key
     JOIN users reporter ON reporter.user_id = anonymous_key.user_id
     WHERE reporter.role_id = 1
       AND reporter.is_active = TRUE
       AND anonymous_key.status = 'active'
       AND anonymous_key.key_algorithm = 'LSAG-secp256k1-v1'
     ORDER BY anonymous_key.created_at ASC, anonymous_key.public_key ASC`
  );

  return result.rows;
};

const getPublicKeyForUser = async ({ userId }) => {
  const result = await pool.query(
    `SELECT public_key
     FROM anonymous_public_keys
     WHERE user_id = $1
       AND status = 'active'
       AND key_algorithm = 'LSAG-secp256k1-v1'
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

const revokePublicKey = async ({ userId, reason = "revoked" }) => {
  const result = await pool.query(
    `UPDATE anonymous_public_keys
     SET status = 'revoked', revoked_reason = $2, updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, reason]
  );

  return result.rows[0];
};

const getPublicKeyByUser = async ({ userId }) => {
  const result = await pool.query(
    `SELECT *
     FROM anonymous_public_keys
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0];
};

const insertAnonymousReport = async ({
  incidentId,
  reportHash,
  ring,
  signature,
  linkabilityTag,
  linkabilityScope,
  verificationResult,
  userId,
}, database = pool) => {
  const result = await database.query(
    `INSERT INTO anonymous_reports (
        incident_id,
        user_id,
        report_hash,
        ring_members,
        signature,
        linkability_tag,
        linkability_scope,
        verification_result,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
    [
      incidentId,
      userId,
      reportHash,
      JSON.stringify(ring || []),
      signature,
      linkabilityTag,
      linkabilityScope,
      verificationResult,
    ]
  );

  return result.rows[0];
};

const checkLinkabilityHistory = async ({ linkabilityTag, linkabilityScope }, database = pool) => {
  const result = await database.query(
    `SELECT *
     FROM anonymous_reports
     WHERE linkability_tag = $1
       AND linkability_scope = $2
     ORDER BY created_at DESC`,
    [linkabilityTag, linkabilityScope]
  );

  return result.rows;
};

module.exports = {
  registerPublicKey,
  getEligiblePublicKeys,
  getPublicKeyForUser,
  getPublicKeyByUser,
  revokePublicKey,
  insertAnonymousReport,
  checkLinkabilityHistory,
};
