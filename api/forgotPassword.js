const crypto = require("crypto");
const User = require("../models/user");

module.exports = async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "If account exists, reset link sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.reset_token = resetToken;
    user.reset_token_expires = Date.now() + 60 * 60 * 1000; // 1 hour

    await user.save();

    console.log("Reset token:", resetToken);

    res.json({ message: "If account exists, reset link sent" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
