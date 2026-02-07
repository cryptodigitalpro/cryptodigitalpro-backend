import express from "express";
import { pool } from "../db.js";
import { auth, authAdmin } from "../middleware/auth.js";
import { sendMail } from "../mailer.js";
import { notifyUser } from "../ws.js";

const router = express.Router();

/* ================= APPROVE KYC ================= */
router.post("/approve", auth, authAdmin, async (req, res) => {
  const { user_id } = req.body;

  const q = await pool.query(
    "UPDATE users SET kyc_status='approved' WHERE id=$1 RETURNING email",
    [user_id]
  );

  if (!q.rows.length) {
    return res.status(404).json({ error: "User not found" });
  }

  await sendMail(
    q.rows[0].email,
    "KYC Approved – CryptoDigitalPro",
    `
      <h2>Verification Successful ✅</h2>
      <p>Your identity verification has been approved.</p>
      <p>You can now withdraw funds without restriction.</p>
    `
  );

  notifyUser(user_id, {
    type: "notification",
    message: "KYC approved. Withdrawals unlocked."
  });

  res.json({ success: true });
});

/* ================= REJECT KYC ================= */
router.post("/reject", auth, authAdmin, async (req, res) => {
  const { user_id } = req.body;

  const q = await pool.query(
    "UPDATE users SET kyc_status='rejected' WHERE id=$1 RETURNING email",
    [user_id]
  );

  if (!q.rows.length) {
    return res.status(404).json({ error: "User not found" });
  }

  await sendMail(
    q.rows[0].email,
    "KYC Rejected – CryptoDigitalPro",
    `
      <h2>KYC Rejected ❌</h2>
      <p>Your verification was rejected.</p>
      <p>Please re-upload clear documents and a valid selfie.</p>
    `
  );

  notifyUser(user_id, {
    type: "notification",
    message: "KYC rejected. Please re-upload documents."
  });

  res.json({ success: true });
});

export default router;
