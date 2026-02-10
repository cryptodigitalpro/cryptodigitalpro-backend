import express from "express";
import { pool } from "../server.js";
import { auth } from "../middleware/auth.js";
import { broadcast } from "../ws.js";

const router = express.Router();

/* ================= USER – APPLY LOAN ================= */
router.post("/apply", auth, async (req, res) => {
  const userQ = await pool.query(
    "SELECT kyc_status FROM users WHERE id=$1",
    [req.user.id]
  );

  if (userQ.rows[0].kyc_status !== "approved") {
    return res.status(403).json({
      error: "KYC approval required before loan application"
    });
  }

  // create loan here
});

  const q = await pool.query(
    `INSERT INTO loans (user_id, amount, duration, loan_type)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [req.user.id, amount, duration, loan_type]
  );

  broadcast({
    type: "notification",
    message: "New loan application",
  });

  res.json(q.rows[0]);
});

/* ================= USER – MY LOANS ================= */
router.get("/my", auth, async (req, res) => {
  const q = await pool.query(
    "SELECT * FROM loans WHERE user_id = $1 ORDER BY id DESC",
    [req.user.id]
  );
  res.json(q.rows);
});

/* ================= USER – WITHDRAW ================= */
router.post("/withdraw", auth, async (req, res) => {
  const { amount } = req.body;

  const userQ = await pool.query(
    "SELECT balance FROM users WHERE id = $1",
    [req.user.id]
  );

  if (userQ.rows[0].balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const lockedLoan = await pool.query(
    "SELECT id FROM loans WHERE user_id = $1 AND locked = true",
    [req.user.id]
  );

  if (lockedLoan.rows.length) {
    return res.status(403).json({ error: "Withdrawals locked by admin" });
  }

  await pool.query(
    "UPDATE users SET balance = balance - $1 WHERE id = $2",
    [amount, req.user.id]
  );

  await pool.query(
    `INSERT INTO transactions (user_id, amount, type, note)
     VALUES ($1,$2,'debit','Withdrawal request')`,
    [req.user.id, amount]
  );

  res.json({ success: true });
});

export default router;

