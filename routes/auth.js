const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const User = require("../models/user");

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    let { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    email = email.toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password (important if not handled in model pre-save hook)
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name,
      email,
      password: hashedPassword,
      role: "user"
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      is_admin: false
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    let { email, password, twofa_code } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    email = email.toLowerCase();

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (user.account_status && user.account_status !== "active") {
      return res.status(403).json({ error: "Account suspended" });
    }

    /* ================= ADMIN 2FA ================= */
    if (user.role === "admin") {

      if (!user.twofa_enabled) {
        const secret = speakeasy.generateSecret({
          name: `CryptoDigitalPro Admin (${user.email})`
        });

        user.twofa_secret = secret.base32;
        user.twofa_enabled = true;
        await user.save();

        const qr = await QRCode.toDataURL(secret.otpauth_url);

        return res.json({
          require_2fa_setup: true,
          qr,
          manual_code: secret.base32
        });
      }

      if (!twofa_code) {
        return res.json({ require_2fa: true });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twofa_secret,
        encoding: "base32",
        token: twofa_code,
        window: 1
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid 2FA code" });
      }
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      is_admin: user.role === "admin"
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;