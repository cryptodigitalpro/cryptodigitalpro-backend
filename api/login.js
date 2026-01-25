import { createAccessToken, createRefreshToken } from "../utils/tokens.js";

const accessToken = createAccessToken(user);
const refreshToken = createRefreshToken(user);

await pool.query(
  `INSERT INTO refresh_tokens(user_id, token, expires_at)
   VALUES($1,$2,NOW()+INTERVAL '7 days')`,
  [user.id, refreshToken]
);

res.json({ accessToken, refreshToken });
