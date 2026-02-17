const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    let { full_name, email, password } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    email = email.toLowerCase();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users 
       (full_name, email, password, role) 
       VALUES ($1,$2,$3,$4) 
       RETURNING id, role`,
      [full_name, email, hashed, "user"]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, role: result.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, is_admin: false });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    let { email, password, twofa_code } = req.body;

    email = email.toLowerCase();

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: "Invalid credentials" });

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Invalid credentials" });

    /* ================= ADMIN 2FA ================= */
    if (user.role === "admin") {

      if (!user.twofa_enabled) {

        const secret = speakeasy.generateSecret({
          name: `CryptoDigitalPro Admin (${user.email})`
        });

        await pool.query(
          "UPDATE users SET twofa_secret=$1 WHERE id=$2",
          [secret.base32, user.id]
        );

        const qr = await QRCode.toDataURL(secret.otpauth_url);

        return res.json({
          require_2fa_setup: true,
          qr,
          manual_code: secret.base32
        });
      }

      if (!twofa_code)
        return res.json({ require_2fa: true });

      const verified = speakeasy.totp.verify({
        secret: user.twofa_secret,
        encoding: "base32",
        token: twofa_code,
        window: 1
      });

      if (!verified)
        return res.status(400).json({ error: "Invalid 2FA code" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      is_admin: user.role === "admin"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GOOGLE LOGIN ================= */
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token)
      return res.status(400).json({ error: "Google token required" });

    // NOTE:
    // You should verify Google token properly with Google API in production.
    // For now, this assumes frontend token is trusted.

    const decoded = jwt.decode(token);
    if (!decoded?.email)
      return res.status(400).json({ error: "Invalid Google token" });

    const email = decoded.email.toLowerCase();

    let user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (full_name, email, password, role)
         VALUES ($1,$2,$3,$4)
         RETURNING id, role`,
        [decoded.name || "Google User", email, "", "user"]
      );

      user = { rows: [newUser.rows[0]] };
    }

    const dbUser = user.rows[0];

    const newToken = jwt.sign(
      { id: dbUser.id, role: dbUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: newToken, is_admin: false });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Google login failed" });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0)
      return res.json({ message: "If account exists, reset link sent" });

    const user = result.rows[0];

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `UPDATE users 
       SET reset_token=$1, reset_token_expiry=$2 
       WHERE id=$3`,
      [hashedToken, expiry, user.id]
    );

    const resetURL =
      `https://cryptodigitalpro.com/reset-password.html?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      to: email,
      subject: "Password Reset",
      html: `
        <h3>Password Reset</h3>
        <p>Click link below to reset password:</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>This link expires in 15 minutes.</p>
      `
    });

    res.json({ message: "If account exists, reset link sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res.status(400).json({ error: "Missing fields" });

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const result = await pool.query(
      `SELECT id FROM users
       WHERE reset_token=$1
       AND reset_token_expiry > NOW()`,
      [hashedToken]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password=$1,
           reset_token=NULL,
           reset_token_expiry=NULL
       WHERE id=$2`,
      [hashedPassword, result.rows[0].id]
    );

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;