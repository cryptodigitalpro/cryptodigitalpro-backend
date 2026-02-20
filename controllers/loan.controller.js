// controllers/loan.controller.js

const Loan = require("../models/loan");
const User = require("../models/user");
const Notification = require("../models/notification");

/* =========================================
   APPLY LOAN
========================================= */

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

    if (user.kycStatus !== "approved") {
      return res.status(403).json({
        message: "KYC approval required before loan application"
      });
    }

    // Prevent multiple active loans
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
      amount,
      duration,
      loanType,
      interestRate,
      interestAmount,
      totalRepayment,
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

/* =========================================
   ADMIN UPDATE LOAN STATUS
========================================= */

exports.updateLoanStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    loan.status = status;
    await loan.save();

    const user = await User.findById(loan.userId);

    if (status === "approved") {
      user.availableBalance += loan.amount;
      user.outstandingBalance += loan.totalRepayment;
      await user.save();
    }

    await Notification.create({
      user: loan.userId,
      title: `Loan ${status}`,
      message: `Your ${loan.loanType} loan was ${status}.`,
      type: "loan"
    });

    res.json({ message: "Loan updated successfully" });

  } catch (err) {
    console.error("Loan Update Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};