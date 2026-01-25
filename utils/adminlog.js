import { pool } from "../server.js";

export async function logAdmin(adminId, action) {
  await pool.query(
    "INSERT INTO admin_logs(admin_id, action) VALUES ($1,$2)",
    [adminId, action]
  );
}
