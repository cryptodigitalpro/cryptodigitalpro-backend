// controllers/dashboard.controller.js

const User = require("../models/User");
const Loan = require("../models/Loan");
const Withdrawal = require("../models/Withdrawal");
const Notification = require("../models/Notification");

/* ================= GET DASHBOARD ================= */

exports.getDashboard = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const loans = await Loan.find({ userId: user._id }).sort({ createdAt: -1 });
    const withdrawals = await Withdrawal.find({ userId: user._id }).sort({ createdAt: -1 });
    const notifications = await Notification.find({ user: user._id }).sort({ createdAt: -1 });

    res.json({
      balances: {
        deposited: user.depositedBalance || 0,
        available: user.availableBalance || 0,
        outstanding: user.outstandingBalance || 0,
        withdrawn: user.withdrawnBalance || 0
      },
      loans,
      withdrawals,
      notifications
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};