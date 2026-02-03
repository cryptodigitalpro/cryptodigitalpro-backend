import express from "express";
import { pool } from "../server.js";
import { auth, authAdmin } from "../middleware/auth.js";
import { logAdmin } from "../utils/adminlog.js";

const router = express.Router();

/* ================= USER TRANSACTIONS ================= */
/* User can only see THEIR OWN transactions */
router.get("/my", auth, async (req, res) => {
  const q = await pool.query(
    `SELECT id, amount, type, note, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY id DESC`,
    [req.user.id]
  );

  res.json(q.rows);
});

/* ================= ADMIN: CREATE TRANSACTION ================= */
/* Manual credits, debits, adjustments */
router.post("/admin/add", auth, authAdmin, async (req, res) => {
  const { user_id, amount, type, note } = req.body;

  if (!["credit", "debit", "adjustment"].includes(type)) {
    return res.status(400).json({ error: "Invalid transaction type" });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  /* Insert transaction */
  await pool.query(
    `INSERT INTO transactions(user_id, amount, type, note)
     VALUES ($1, $2, $3, $4)`,
    [user_id, amount, type, note || ""]
  );

  /* Update balance */
  if (type === "credit" || type === "adjustment") {
    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [amount, user_id]
    );
  }

  if (type === "debit") {
    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [amount, user_id]
    );
  }

  /* Audit log */
  await logAdmin(
    req.user.id,
    `Added ${type} transaction of ${amount} for user #${user_id}`
  );

  res.json({ success: true });
});

export default router;
