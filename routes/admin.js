import express from "express";
import { pool } from "../server.js";
import { auth, authAdmin } from "../utils/auth.js";
import { logAdmin } from "../utils/audit.js";
import { sendMail } from "../mailer.js";

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
    SELECT loans.*, users.email, users.full_name
    FROM loans
    JOIN users ON users.id = loans.user_id
    ORDER BY loans.id DESC
  `);
  res.json(q.rows);
});

/* ================= APPROVE / REJECT LOAN ================= */
router.post("/loans/:id/status", auth, authAdmin, async (req, res) => {
  const { status, reason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const loanQ = await pool.query(
    `SELECT loans.*, users.kyc_status, users.email
     FROM loans
     JOIN users ON users.id = loans.user_id
     WHERE loans.id = $1`,
    [req.params.id]
  );

  const loan = loanQ.rows[0];
  if (!loan) {
    return res.status(404).json({ error: "Loan not found" });
  }

  // 🔒 KYC CHECK
  if (status === "approved" && loan.kyc_status !== "approved") {
    return res.status(400).json({
      error: "User KYC not approved"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE loans SET status=$1, rejection_reason=$2 WHERE id=$3",
      [status, reason || null, req.params.id]
    );

    if (status === "approved") {
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE id=$2",
        [loan.amount, loan.user_id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Loan update failed" });
  } finally {
    client.release();
  }

  // 📧 EMAIL NOTIFICATION
  await sendMail(
    loan.email,
    status === "approved" ? "Loan Approved" : "Loan Rejected",
    status === "approved"
      ? `<p>Your loan of <b>$${loan.amount}</b> has been approved.</p>`
      : `<p>Your loan was rejected.<br/>Reason: ${reason || "Not specified"}</p>`
  );

  await logAdmin(req.user.id, `Loan ${status} #${loan.id}`);

  res.json({ success: true });
});

/* ================= KYC APPROVAL ================= */
router.post("/kyc/:userId", auth, authAdmin, async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid KYC status" });
  }

  await pool.query(
    "UPDATE users SET kyc_status=$1 WHERE id=$2",
    [status, req.params.userId]
  );

  await logAdmin(req.user.id, `KYC ${status} for user ${req.params.userId}`);

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
  const loans = await pool.query("SELECT COUNT(*) FROM loans");
  const pending = await pool.query(
    "SELECT COUNT(*) FROM loans WHERE status='pending'"
  );

  res.json({
    totalLoans: Number(loans.rows[0].count),
    pendingLoans: Number(pending.rows[0].count)
  });
});

export default router;
