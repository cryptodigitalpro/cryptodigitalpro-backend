const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  adminId: String,
  action: String,
  targetUser: String,
  meta: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);