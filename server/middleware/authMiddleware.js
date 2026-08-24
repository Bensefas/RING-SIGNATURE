const jwt = require("jsonwebtoken");
const AuthModel = require("../models/authModel");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization token."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: user ID is missing."
      });
    }

    const user = await AuthModel.findUserById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists."
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive."
      });
    }

    /*
    =====================================================
    NORMALIZED AUTHENTICATED USER
    =====================================================

    The database uses:
      users.id
      users.role_id

    The JWT uses:
      user_id
      role_id
      role_name

    We expose both naming conventions so older
    project controllers remain compatible.
    */

    req.user = {
      id: user.id,
      userId: user.id,
      user_id: user.id,

      roleId: Number(user.role_id),
      role_id: Number(user.role_id),

      roleName: user.role_name,
      role_name: user.role_name,

      firstName: user.first_name,
      first_name: user.first_name,

      lastName: user.last_name,
      last_name: user.last_name,

      email: user.email
    };

    next();

  } catch (error) {

    console.error(
      "Auth Middleware Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
};

module.exports = authMiddleware;