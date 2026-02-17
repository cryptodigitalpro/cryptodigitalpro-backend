// controllers/loan.controller.js

const Loan = require("../models/Loan");
const User = require("../models/User");
const Notification = require("../models/Notification");

/* ================= APPLY FOR LOAN ================= */

exports.applyLoan = async (req, res) => {
  try {
    const { loan_type, amount, duration } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔒 Prevent multiple active loans
    const activeLoan = await Loan.findOne({
      userId: user._id,
      status: { $in: ["pending", "approved"] }
    });

    if (activeLoan) {
      return res.status(400).json({
        message: "You already have an active loan."
      });
    }

    const interestRate = 0.10;
    const interestAmount = amount * interestRate;
    const totalRepayment = amount + interestAmount;

    const loan = await Loan.create({
      userId: user._id,
      loan_type,
      amount,
      duration,
      interestRate,
      interestAmount,
      totalRepayment,
      status: "pending"
    });

    // 🔔 In-app notification
    await Notification.create({
      user: user._id,
      title: "Loan Application Submitted",
      message: `Your ${loan_type} loan request of $${amount} is under review.`,
      type: "loan"
    });

    res.json({ message: "Loan submitted successfully", loan });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};