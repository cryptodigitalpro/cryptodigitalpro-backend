/* =====================================
   AUTH MIDDLEWARE (Production Safe)
===================================== */

const jwt = require("jsonwebtoken");
const User = require("../models/user");

/* ==============================
   PROTECT ROUTES (Logged-in only)
============================== */

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(decoded.id)
      .select("_id role account_status")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (user.account_status !== "active") {
      return res.status(403).json({ message: "Account suspended." });
    }

    req.user = {
      id: user._id,
      role: user.role
    };

    next();

  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(500).json({ message: "Server authentication error." });
  }
};



/* ==============================
   ADMIN ONLY MIDDLEWARE
============================== */

exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  next();
};