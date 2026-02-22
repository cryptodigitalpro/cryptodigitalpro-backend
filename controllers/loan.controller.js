const Loan = require("../models/Loan");
const User = require("../models/User");
const Notification = require("../models/Notification");

exports.applyLoan = async (req, res) => {
  try {
    // ✅ Make sure token middleware worked
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { loanType, amount, duration } = req.body;

    // ✅ Basic validation
    if (!loanType || !amount || !duration) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Optional KYC check (remove if not needed)
    if (user.kyc_status && user.kyc_status !== "approved") {
      return res.status(400).json({ message: "KYC not approved" });
    }

    // ✅ Create loan
    const loan = await Loan.create({
      user: user._id,      // MUST match your model
      loanType,
      amount,
      duration,
      status: "pending"
    });

    // ✅ Optional: create notification
    await Notification.create({
      user: user._id,
      message: `Loan application of ${amount} submitted successfully`,
      type: "loan"
    });

    return res.status(201).json({
      message: "Loan application submitted successfully",
      loan
    });

  } catch (error) {
    console.error("Loan Apply Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};