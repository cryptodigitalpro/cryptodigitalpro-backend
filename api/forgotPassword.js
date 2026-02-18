import crypto from "crypto";
import pool from "../config/db.js";

export default async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    const user = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.json({ message: "If account exists, reset link sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `UPDATE users
       SET reset_token=$1, reset_token_expires=NOW()+INTERVAL '1 hour'
       WHERE email=$2`,
      [resetToken, email]
    );

    // Here you would send email
    console.log("Reset token:", resetToken);

    res.json({ message: "If account exists, reset link sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
