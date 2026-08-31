const pool = require("../config/db");

const createUser = async (userData) => {
  const {
    staff_student_id,
    first_name,
    last_name,
    email,
    phone,
    password_hash,
    role_id,
    unit_id
  } = userData;

  const result = await pool.query(
    `INSERT INTO users (
      staff_student_id,
      first_name,
      last_name,
      email,
      phone,
      password_hash,
      role_id,
      unit_id
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING
      user_id,
      staff_student_id,
      first_name,
      last_name,
      email,
      phone,
      role_id,
      unit_id,
      is_active,
      created_at,
      updated_at`,
    [
      staff_student_id,
      first_name,
      last_name,
      email,
      phone,
      password_hash,
      role_id,
      unit_id
    ]
  );

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT
      u.user_id,
      u.staff_student_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.password_hash,
      u.role_id,
      r.role_name,
      u.unit_id,
      o.unit_name,
      u.is_active,
      u.last_login,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN organizational_units o
      ON u.unit_id = o.unit_id
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE u.email = $1`,
    [email]
  );

  return result.rows[0];
};

const findUserById = async (userId) => {
  const result = await pool.query(
    `SELECT
      u.user_id,
      u.staff_student_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.role_id,
      r.role_name,
      u.department,
      u.faculty,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = $1`,
    [userId]
  );

  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};