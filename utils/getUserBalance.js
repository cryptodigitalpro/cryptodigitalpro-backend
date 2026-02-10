import { pool } from "../server.js";

export async function getUserBalance(userId) {
  const q = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance
     FROM balance_ledger
     WHERE user_id = $1`,
    [userId]
  );

  return Number(q.rows[0].balance);
}