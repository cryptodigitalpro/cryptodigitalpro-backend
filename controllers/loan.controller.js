const Loan = require("../models/Loan");
const User = require("../models/User");
const Notification = require("../models/Notification");

exports.applyLoan = async (req, res) => {
  try {
    const { amount, duration, loanType } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid loan amount" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ FIXED KYC FIELD
    if (user.kyc_status !== "approved") {
      return res.status(403).json({
        message: "KYC approval required before loan application"
      });
    }

    // ✅ FIXED user FIELD
    const activeLoan = await Loan.findOne({
      user: user._id,
      status: { $in: ["pending", "approved"] }
    });

    if (activeLoan) {
      return res.status(400).json({
        message: "You already have an active loan."
      });
    }

    const loan = await Loan.create({
      user: user._id,
      amount,
      duration,
      loanType,
      status: "pending"
    });

    await Notification.create({
      user: user._id,
      title: "Loan Submitted",
      message: `Your loan request of $${amount} is under review.`,
      type: "loan"
    });

    res.status(201).json({
      message: "Loan submitted successfully",
      loan
    });

  } catch (err) {
    console.error("Apply Loan Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};