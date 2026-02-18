const jwt = require("jsonwebtoken");

function createAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role || user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

module.exports = {
  createAccessToken,
  createRefreshToken
};
