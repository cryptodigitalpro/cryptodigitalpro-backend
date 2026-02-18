import bcrypt from "bcrypt";
import { createAccessToken, createRefreshToken } from "../utils/tokens.js";
import pool from "../config/db.js";

export default async function register(req, res) {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users(full_name, email, password)
       VALUES($1,$2,$3)
       RETURNING id, email, role`,
      [full_name, email, hashedPassword]
    );

    const user = newUser.rows[0];

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await pool.query(
      `INSERT INTO refresh_tokens(user_id, token, expires_at)
       VALUES($1,$2,NOW()+INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
