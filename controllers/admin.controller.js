import express from "express";
import { pool } from "../server.js";
import { auth, authAdmin } from "../utils/auth.js";
import { logAdmin } from "../utils/audit.js";
import { notifyUser, notifyAdmins } from "../ws.js";

const router = express.Router();

/* ================= USERS ================= */
router.get("/users", auth, authAdmin, async (req, res) => {
  const q = await pool.query(
    "SELECT id, email, full_name, kyc_status FROM users ORDER BY id DESC"
  );
  res.json(q.rows);
});

/* ================= LOANS ================= */
router.get("/loans", auth, authAdmin, async (req, res) => {
  const q = await pool.query(`
    SELECT loans.*, users.full_name, users.email
    FROM loans
    JOIN users ON users.id = loans.user_id
    ORDER BY loans.id DESC
  `);
  res.json(q.rows);
});

/* ================= LOAN STATUS ================= */
router.post("/loan-status", auth, authAdmin, async (req, res) => {
  const { loan_id, status } = req.body;

  if (!["approved", "rejected", "credited"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const loanRes = await pool.query(
    "SELECT * FROM loans WHERE id=$1",
    [loan_id]
  );

  const loan = loanRes.rows[0];
  if (!loan) {
    return res.status(404).json({ error: "Loan not found" });
  }

  // 🔒 prevent double credit
  if (loan.status === "credited") {
    return res.status(400).json({
      error: "Loan already credited."
    });
  }

  // 🔒 only approved can be credited
  if (status === "credited" && loan.status !== "approved") {
    return res.status(400).json({
      error: "Loan must be approved before crediting"
    });
  }

  await pool.query(
    "UPDATE loans SET status=$1 WHERE id=$2",
    [status, loan_id]
  );

  /* ================= CREDIT BALANCE WHEN CREDITED ================= */
  if (status === "credited") {
    await pool.query(
      `INSERT INTO balance_ledger
       (user_id, amount, type, reference_id, admin_id, note)
       VALUES ($1, $2, 'loan_credit', $3, $4, 'Loan credited')`,
      [loan.user_id, loan.amount, loan.id, req.user.id]
    );

    notifyUser(loan.user_id, {
      type: "loan",
      message: `Your loan of ${loan.amount} has been credited`
    });
  }

  await logAdmin(req.user.id, `Loan #${loan_id} → ${status}`);

  notifyAdmins({
    type: "loan_update",
    id: loan_id
  });

  res.json({ success: true });
});

/* ================= KYC ================= */
router.post("/kyc/:id", auth, authAdmin, async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid KYC status" });
  }

  await pool.query(
    "UPDATE users SET kyc_status=$1 WHERE id=$2",
    [status, req.params.id]
  );

  await logAdmin(req.user.id, `KYC ${status} for user #${req.params.id}`);

  notifyUser(req.params.id, {
    type: "notification",
    message: `Your KYC status is now ${status}`
  });

  notifyAdmins({
    type: "notification",
    message: `KYC ${status} for user #${req.params.id}`
  });

  res.json({ success: true });
});

/* ================= BALANCE ADJUSTMENT ================= */
router.post("/balance/adjust", auth, authAdmin, async (req, res) => {
  const { userId, amount, reason } = req.body;

  if (!userId || typeof amount !== "number" || amount === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (!reason || reason.length < 5) {
    return res.status(400).json({ error: "Reason required" });
  }

  await pool.query(
    `INSERT INTO balance_ledger
     (user_id, amount, type, admin_id, note)
     VALUES ($1, $2, 'admin_adjustment', $3, $4)`,
    [userId, amount, req.user.id, reason]
  );

  await logAdmin(
    req.user.id,
    `Adjusted balance of user #${userId} by ${amount}`
  );

  notifyUser(userId, {
    type: "notification",
    message: `Admin adjusted your balance by ${amount}`
  });

  res.json({ success: true });
});

/* ================= ANALYTICS ================= */
router.get("/analytics", auth, authAdmin, async (req, res) => {
  const users = await pool.query("SELECT COUNT(*) FROM users");
  const loans = await pool.query("SELECT COUNT(*) FROM loans");
  const volume = await pool.query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM balance_ledger"
  );
  const pending = await pool.query(
    "SELECT COUNT(*) FROM loans WHERE status='pending'"
  );

  res.json({
    totalUsers: Number(users.rows[0].count),
    totalLoans: Number(loans.rows[0].count),
    totalVolume: Number(volume.rows[0].total),
    pendingLoans: Number(pending.rows[0].count)
  });
});

export default router;