// controllers/dashboard.controller.js

const User = require("../models/User");
const Loan = require("../models/Loan");
const Withdrawal = require("../models/Withdrawal");
const Notification = require("../models/Notification");

exports.getDashboard = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const loans = await Loan.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    const withdrawals = await Withdrawal.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    const notifications = await Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      balances: {
        deposited: user.depositedBalance || 0,
        available: user.availableBalance || 0,
        outstanding: user.outstandingBalance || 0,
        withdrawn: user.withdrawnBalance || 0
      },
      loans: loans || [],
      withdrawals: withdrawals || [],
      notifications: notifications || []
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};