const jwt = require("jsonwebtoken");

module.exports.verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports.adminOnly = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
};
