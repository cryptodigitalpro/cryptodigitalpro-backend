const { createAccessToken, createRefreshToken } = require("../utils/tokens");
const pool = require("../config/db"); // adjust if your pool is elsewhere
const bcrypt = require("bcrypt");

module.exports = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await pool.query(
      `INSERT INTO refresh_tokens(user_id, token, expires_at)
       VALUES($1,$2,NOW()+INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
