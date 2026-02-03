import AuditLog from "../models/Auditlog.js";

export async function logAudit(admin, action, target, meta = {}){
  await AuditLog.create({
    adminId: admin.id,
    action,
    targetUser: target,
    meta
  });
}
import { pool } from "../server.js";

export async function logAdmin(adminId, action) {
  await pool.query(
    "INSERT INTO admin_logs(admin_id, action) VALUES ($1,$2)",
    [adminId, action]
  );
}

import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(403);
  }
}

export function authAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}
