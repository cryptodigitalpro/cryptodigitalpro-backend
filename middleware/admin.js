/* =====================================
   ADMIN MIDDLEWARE
===================================== */

module.exports = function (req, res, next) {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();

  } catch (err) {
    console.error("Admin Middleware Error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
