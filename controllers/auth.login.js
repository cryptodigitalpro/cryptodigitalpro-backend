const { createAccessToken, createRefreshToken } = require("../utils/tokens");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

module.exports = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};