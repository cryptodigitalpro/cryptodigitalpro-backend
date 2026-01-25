export default {
  adminId: String,
  action: String,
  targetUser: String,
  meta: Object,
  createdAt: { type: Date, default: Date.now }
};
