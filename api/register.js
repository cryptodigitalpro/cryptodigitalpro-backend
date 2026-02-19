const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { createAccessToken, createRefreshToken } = require("../utils/tokens");

module.exports = async function register(req, res) {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      full_name,
      email,
      password: hashedPassword,
      role: "user"
    });

    const accessToken = createAccessToken(newUser);
    const refreshToken = createRefreshToken(newUser);

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
