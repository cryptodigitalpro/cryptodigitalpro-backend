import express from "express";
import { pool } from "../server.js";
import { auth, authAdmin } from "../middleware/auth.js";
import { logAdmin } from "../utils/audit.js";
import { sendMail } from "../mailer.js";
import { notifyUser, notifyAdmins } from "../ws.js";
import { processWithdrawal } from "../controllers/withdraw.controller.js";

const router = express.Router();

/* ================= USERS ================= */
router.get("/users", auth, authAdmin, async (req, res) => {
  const q = await pool.query(
    "SELECT id, email, full_name, balance, kyc_status FROM users"
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

/* ===== APPROVE / REJECT LOAN ===== */
router.post("/loan-status", auth, authAdmin, async (req, res) => {
  const { loan_id, status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const q = await pool.query(
    "UPDATE loans SET status=$1 WHERE id=$2 RETURNING *",
    [status, loan_id]
  );

  const loan = q.rows[0];
  if (!loan) return res.status(404).json({ error: "Loan not found" });

  if (status === "approved") {
    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [loan.amount, loan.user_id]
    );

    const user = await pool.query(
      "SELECT email FROM users WHERE id=$1",
      [loan.user_id]
    );

    await sendMail(
      user.rows[0].email,
      "Loan Approved",
      `Your loan of $${loan.amount} has been approved.`
    );

    notifyUser(loan.user_id, {
      type: "notification",
      message: `Your loan of $${loan.amount} has been approved`
    });
  }

  await logAdmin(req.user.id, `Loan ${status} #${loan_id}`);
  notifyAdmins({ type: "notification", message: `Loan #${loan_id} ${status}` });

  res.json(loan);
});

/* ================= KYC ================= */
router.post("/kyc/:id", auth, authAdmin, async (req, res) => {
  const { status } = req.body;

  await pool.query(
    "UPDATE users SET kyc_status=$1 WHERE id=$2",
    [status, req.params.id]
  );

  await logAdmin(req.user.id, `KYC ${status} for user #${req.params.id}`);

  notifyUser(req.params.id, {
    type: "notification",
    message: `Your KYC status is now ${status}`
  });

  res.json({ success: true });
});

/* ================= WITHDRAWALS ================= */
router.get("/withdrawals", auth, authAdmin, async (req, res) => {
  const q = await pool.query(`
    SELECT w.*, u.email AS user_email
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    ORDER BY w.created_at DESC
  `);
  res.json(q.rows);
});

/* ===== APPROVE WITHDRAW ===== */
router.post("/withdraw/approve", auth, authAdmin, async (req, res) => {
  const { id } = req.body;

  const q = await pool.query(`
    UPDATE withdrawals
    SET admin_verified=true, status='processing'
    WHERE id=$1 RETURNING *
  `, [id]);

  const withdraw = q.rows[0];
  if (!withdraw) return res.status(404).json({ error: "Not found" });

  await processWithdrawal(withdraw);
  await logAdmin(req.user.id, `Approved withdrawal #${id}`);

  notifyUser(withdraw.user_id, {
    type: "withdraw",
    progress: withdraw.progress,
    message: "Withdrawal approved by admin"
  });

  res.json({ success: true });
});

/* ===== REJECT WITHDRAW ===== */
router.post("/withdraw/reject", auth, authAdmin, async (req, res) => {
  const { id } = req.body;

  const q = await pool.query(`
    UPDATE withdrawals
    SET status='rejected'
    WHERE id=$1 RETURNING *
  `, [id]);

  const withdraw = q.rows[0];
  if (!withdraw) return res.status(404).json({ error: "Not found" });

  await logAdmin(req.user.id, `Rejected withdrawal #${id}`);

  notifyUser(withdraw.user_id, {
    type: "withdraw",
    progress: withdraw.progress,
    message: "Your withdrawal was rejected"
  });

  res.json({ success: true });
});

/* ===== CONFIRM GAS FEE ===== */
router.post("/withdraw/confirm-fee", auth, authAdmin, async (req, res) => {
  const { id } = req.body;

  const q = await pool.query(`
    UPDATE withdrawals
    SET fee_paid=true, status='processing'
    WHERE id=$1 RETURNING *
  `, [id]);

  await processWithdrawal(q.rows[0]);
  res.json({ success: true });
});

/* ===== VERIFY ===== */
router.post("/withdraw/verify", auth, authAdmin, async (req, res) => {
  const { id } = req.body;

  const q = await pool.query(`
    UPDATE withdrawals
    SET admin_verified=true, status='processing'
    WHERE id=$1 RETURNING *
  `, [id]);

  await processWithdrawal(q.rows[0]);
  res.json({ success: true });
});

/* ================= LOGS ================= */
router.get("/logs", auth, authAdmin, async (req, res) => {
  const q = await pool.query(`
    SELECT admin_logs.*, users.email
    FROM admin_logs
    JOIN users ON users.id = admin_logs.admin_id
    ORDER BY admin_logs.id DESC
  `);
  res.json(q.rows);
});

/* ================= ANALYTICS ================= */
router.get("/analytics", auth, authAdmin, async (req, res) => {
  const users = await pool.query("SELECT COUNT(*) FROM users");
  const loans = await pool.query("SELECT COUNT(*) FROM loans");
  const pending = await pool.query("SELECT COUNT(*) FROM loans WHERE status='pending'");
  const volume = await pool.query("SELECT SUM(amount) FROM loans WHERE status='approved'");

  res.json({
    totalUsers: Number(users.rows[0].count),
    totalLoans: Number(loans.rows[0].count),
    pendingLoans: Number(pending.rows[0].count),
    totalVolume: volume.rows[0].sum || 0
  });
});

export default router;
