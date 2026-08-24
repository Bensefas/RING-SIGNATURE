const pool = require("../config/db");
const jwt = require("jsonwebtoken");

/*
=========================================================
REGISTER
=========================================================
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
    unit_id
  } = userData;

  const staffId = staff_student_id || matric_staff_id;

  if (!first_name || !last_name || !email || !password || !role_id) {
    throw new Error("First name, last name, email, password and role are required.");
  }

  const existing = await pool.query(
    "SELECT user_id FROM users WHERE LOWER(email)=LOWER($1)",
    [email]
  );

  if (existing.rows.length) {
    throw new Error("Email already exists.");
  }

  const role = await pool.query(
    "SELECT id,name FROM roles WHERE id=$1",
    [role_id]
  );

  if (!role.rows.length) {
    throw new Error("Selected role does not exist.");
  }

  const result = await pool.query(
    `INSERT INTO users(
      staff_student_id,
      first_name,
      last_name,
      email,
      phone,
      password_hash,
      role_id,
      unit_id,
      is_active
    )
    VALUES(
      $1,$2,$3,$4,$5,
      crypt($6,gen_salt('bf')),
      $7,$8,true
    )
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
      created_at`,
    [
      staffId || null,
      first_name,
      last_name,
      email,
      phone || null,
      password,
      role_id,
      unit_id || null
    ]
  );

  return result.rows[0];
};

/*
=========================================================
LOGIN
=========================================================
*/
const login = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const result = await pool.query(
    `SELECT
      u.user_id,
      u.staff_student_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.role_id,
      u.password_hash,
      u.is_active,
      r.name AS role_name
    FROM users u
    JOIN roles r
      ON u.role_id=r.id
    WHERE LOWER(u.email)=LOWER($1)`,
    [email]
  );

  if (!result.rows.length) {
    throw new Error("Invalid email or password.");
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new Error("This account has been deactivated.");
  }

  const verify = await pool.query(
    "SELECT crypt($1,$2)=$2 AS valid",
    [password, user.password_hash]
  );

  if (!verify.rows[0].valid) {
    throw new Error("Invalid email or password.");
  }

  const token = jwt.sign(
    {
      userId: user.user_id,
      roleId: user.role_id,
      roleName: user.role_name
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  delete user.password_hash;

  return { token, user };
};

module.exports = {
  register,
  login
};