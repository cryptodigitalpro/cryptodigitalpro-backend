import express from "express";
import multer from "multer";
import { auth, authAdmin } from "../middleware/auth.js";
import { pool } from "../db.js";
import { sendMail } from "../mailer.js";
import { notifyUser } from "../ws.js";

const router = express.Router();

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: "uploads/kyc",
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images allowed"));
    }
    cb(null, true);
  }
});

/* ================= USER UPLOAD ================= */
router.post(
  "/upload",
  auth,
  upload.fields([
    { name: "id_front", maxCount: 1 },
    { name: "selfie", maxCount: 1 }
  ]),
  async (req, res) => {

    if (!req.files?.selfie || !req.files?.id_front) {
      return res.status(400).json({ error: "Missing documents" });
    }

    await pool.query(
      `
      UPDATE users
      SET
        kyc_status='pending',
        kyc_selfie=$1,
        kyc_id_front=$2
      WHERE id=$3
      `,
      [
        req.files.selfie[0].filename,
        req.files.id_front[0].filename,
        req.user.id
      ]
    );

    notifyUser(req.user.id, {
      type: "notification",
      message: "KYC submitted. Awaiting review."
    });

    res.json({ success: true });
  }
);

/* ================= ADMIN APPROVE ================= */
router.post("/approve", auth, authAdmin, async (req, res) => {
  const { user_id } = req.body;

  const q = await pool.query(
    "UPDATE users SET kyc_status='approved' WHERE id=$1 RETURNING email",
    [user_id]
  );

  await sendMail(
    q.rows[0].email,
    "KYC Approved – CryptoDigitalPro",
    `
    <h2>Verification Successful ✅</h2>
    <p>Your KYC has been approved.</p>
    <p>You can now withdraw funds.</p>
    `
  );

  notifyUser(user_id, {
    type: "notification",
    message: "KYC approved. Withdrawals unlocked."
  });

  res.json({ success: true });
});

/* ================= ADMIN REJECT ================= */
router.post("/reject", auth, authAdmin, async (req, res) => {
  const { user_id } = req.body;

  const q = await pool.query(
    "UPDATE users SET kyc_status='rejected' WHERE id=$1 RETURNING email",
    [user_id]
  );

  await sendMail(
    q.rows[0].email,
    "KYC Rejected – CryptoDigitalPro",
    `
    <h2>KYC Rejected ❌</h2>
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
