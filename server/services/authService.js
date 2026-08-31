const pool = require("../config/db");
const jwt = require("jsonwebtoken");

/**
 * Register a new user
 */
const register = async (userData) => {
  const {
    staff_student_id,
    matric_staff_id,
    first_name,
    last_name,
    email,
    phone,
    password,
    role_id,
    department,
    faculty
  } = userData;

  // Support both possible frontend field names
  const staffId = staff_student_id || matric_staff_id;

  if (!first_name || !last_name || !email || !password || !role_id) {
    throw new Error(
      "First name, last name, email, password and role are required."
    );
  }

  // Check if email already exists
  const existing = await pool.query(
    `
    SELECT id
    FROM users
    WHERE LOWER(email) = LOWER($1)
    `,
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error("Email already exists.");
  }

  // Confirm that the selected role exists
  const roleResult = await pool.query(
    `
    SELECT id, name
    FROM roles
    WHERE id = $1
    `,
    [role_id]
  );

  if (roleResult.rows.length === 0) {
    throw new Error("Selected role does not exist.");
  }

  // Create user
  const result = await pool.query(
    `
    INSERT INTO users
    (
      role_id,
      first_name,
      last_name,
      email,
      password_hash,
      department,
      faculty,
      phone,
      staff_student_id,
      is_active
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      crypt($5, gen_salt('bf')),
      $6,
      $7,
      $8,
      $9,
      true
    )
    RETURNING
      user_id,
      role_id,
      first_name,
      last_name,
      email,
      department,
      faculty,
      phone,
      staff_student_id,
      is_active,
      created_at
    `,
    [
      role_id,
      first_name,
      last_name,
      email,
      password,
      department || null,
      faculty || null,
      phone || null,
      staffId || null
    ]
  );

  return result.rows[0];
};


/**
 * Login user
 */
const login = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const result = await pool.query(
    `
    SELECT
      u.user_id,
      u.staff_student_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.department,
      u.faculty,
      u.role_id,
      u.password_hash,
      u.is_active,
      r.role_name
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE LOWER(u.email) = LOWER($1)
    `,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password.");
  }

  const user = result.rows[0];

  // Check whether the account is active
  if (!user.is_active) {
    throw new Error("This account has been deactivated.");
  }

  // Verify password using PostgreSQL crypt()
  const verify = await pool.query(
    `
    SELECT crypt($1, $2) = $2 AS valid
    `,
    [password, user.password_hash]
  );

  if (!verify.rows[0].valid) {
    throw new Error("Invalid email or password.");
  }

  // Generate JWT
  const token = jwt.sign(
    {
      user_id: user.user_id,
      role_id: user.role_id,
      role_name: user.role_name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "24h"
    }
  );

  // Never return password hash to frontend
  delete user.password_hash;

  return {
    token,
    user
  };
};


module.exports = {
  register,
  login
};