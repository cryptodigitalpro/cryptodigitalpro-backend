import express from "express";
import { pool } from "../server.js";
import { auth, authAdmin } from "../middleware/auth.js";
import { logAdmin } from "../utils/audit.js";
import { sendMail } from "../mailer.js";
import { notifyUser, notifyAdmins } from "../ws.js";

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
      `<p>Your loan of <b>$${loan.amount}</b> has been approved.</p>`
    );

    notifyUser(loan.user_id, {
      type: "notification",
      message: `Your loan of $${loan.amount} has been approved`
    });
  }

  await logAdmin(req.user.id, `Loan ${status} #${loan_id}`);

  notifyAdmins({
    type: "notification",
    message: `Loan #${loan_id} ${status}`
  });

  res.json(loan);
});

/* ================= KYC APPROVAL ================= */
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

/* ================= ADMIN BALANCE ADJUSTMENT ================= */
router.post("/balance/adjust", auth, authAdmin, async (req, res) => {
  const { userId, amount, reason } = req.body;

  if (!userId || typeof amount !== "number") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id = $2",
    [amount, userId]
  );

  await pool.query(
    `INSERT INTO transactions (user_id, type, amount)
     VALUES ($1, 'admin_adjustment', $2)`,
    [userId, amount]
  );

  await logAdmin(
    req.user.id,
    `Adjusted balance of user #${userId} by ${amount} (${reason || "no reason"})`
  );

  notifyUser(userId, {
    type: "notification",
    message: `Admin adjusted your balance by ${amount}`
  });

  res.json({ success: true });
});

/* ================= ADMIN LOGS ================= */
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
  const volume = await pool.query(
    "SELECT SUM(amount) FROM loans WHERE status='approved'"
  );
  const pending = await pool.query(
    "SELECT COUNT(*) FROM loans WHERE status='pending'"
  );

  res.json({
    totalUsers: Number(users.rows[0].count),
    totalLoans: Number(loans.rows[0].count),
    totalVolume: volume.rows[0].sum || 0,
    pendingLoans: Number(pending.rows[0].count)
  });
});

export default router;
