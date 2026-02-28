const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const User = require("../models/user");

const router = express.Router();



/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    let { full_name, email, password } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    email = email.toLowerCase();

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({
      full_name,
      email,
      password,
      role: "user"
    });

    const token = user.generateAuthToken();

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

    const user = await User.findOne({ email }).select("+password");

    if (!user)
      return res.status(400).json({ error: "Invalid credentials" });

    const valid = await user.comparePassword(password);

    if (!valid)
      return res.status(400).json({ error: "Invalid credentials" });

    if (user.account_status !== "active")
      return res.status(403).json({ error: "Account suspended" });



    /* ================= ADMIN 2FA ================= */
    if (user.role === "admin") {

      if (!user.twofa_enabled) {

        const secret = speakeasy.generateSecret({
          name: `CryptoDigitalPro Admin (${user.email})`
        });

        user.twofa_secret = secret.base32;
        await user.save();

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

    const token = user.generateAuthToken();

    res.json({
      token,
      is_admin: user.role === "admin"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});