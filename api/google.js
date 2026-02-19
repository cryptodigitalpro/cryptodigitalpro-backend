const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const { createAccessToken, createRefreshToken } = require("../utils/tokens");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports = async function googleLogin(req, res) {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        full_name: payload.name,
        email,
        password: null,
        role: "user"
      });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
};
