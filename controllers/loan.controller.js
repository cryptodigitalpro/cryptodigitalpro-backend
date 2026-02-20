// controllers/loan.controller.js

const Loan = require("../models/Loan");
const User = require("../models/User");
const Notification = require("../models/Notification");

exports.applyLoan = async (req, res) => {
  try {
    const { amount, duration, loanType } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.kycStatus !== "approved") {
      return res.status(403).json({
        message: "KYC approval required before loan application"
      });
    }

    const loan = await Loan.create({
      userId: user._id,
      amount,
      duration,
      loanType,
      status: "pending"
    });

    await Notification.create({
      user: user._id,
      message: "Loan application submitted",
      type: "loan"
    });

    res.status(201).json(loan);

  } catch (err) {
    console.error("Apply Loan Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};