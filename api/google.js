import { OAuth2Client } from "google-auth-library";
import { createAccessToken, createRefreshToken } from "../utils/tokens.js";
import pool from "../config/db.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function googleLogin(req, res) {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    let user = await pool.query(
      "SELECT id, email, role FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      user = await pool.query(
        `INSERT INTO users(full_name, email)
         VALUES($1,$2)
         RETURNING id, email, role`,
        [payload.name, email]
      );
    }

    const account = user.rows[0];

    const accessToken = createAccessToken(account);
    const refreshToken = createRefreshToken(account);

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Google login failed" });
  }
}
