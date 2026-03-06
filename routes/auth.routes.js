const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail }).select("+password");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.account_status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    if (!user.password) {
      return res.status(401).json({
        error: "Use Google login for this account"
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = user.generateAuthToken();

    res.json({
      success: true,
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
});

/* ================= REGISTER ================= */

router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const user = await User.create({
      full_name,
      email: cleanEmail,
      password,
      role: "user"
    });

    const token = user.generateAuthToken();

    res.json({
      success: true,
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Register error:", err);

    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

module.exports = router;