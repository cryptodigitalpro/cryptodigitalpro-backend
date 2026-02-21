require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/auth.routes");
const withdrawRoutes = require("./routes/withdraw.routes");
const adminWithdrawRoutes = require("./routes/admin.withdraw.routes");

const app = express();
const PORT = process.env.PORT || 5000;

/* ================= DATABASE ================= */

console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

mongoose.set("strictQuery", true); // ✅ FIX — prevents hidden query bugs

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("Mongo Error:", err);
    process.exit(1);
  });

/* ================= MODELS ================= */

const User = require("./models/user");
const Loan = require("./models/loan");
const Withdrawal = require("./models/withdrawal");
const Notification = require("./models/notification");

/* ================= MIDDLEWARE ================= */

app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "https://cryptodigitalpro.com",
    "https://www.cryptodigitalpro.com"
  ],
  credentials: true
}));

/* ================= AUTH ================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.sendStatus(401);
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);

    req.user = decoded;
    next();
  });
}

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);

app.use("/api/withdraw", authenticateToken, withdrawRoutes);
app.use("/api/admin/withdraw", authenticateToken, adminWithdrawRoutes);

/* ======================================================
   ================= APPLY LOAN =========================
   ====================================================== */

app.post("/api/loan/apply", authenticateToken, async (req, res) => {
  try {

    const { loan_type, amount, duration } = req.body;

    // ✅ FIX — validate required fields
    if (!loan_type) {
      return res.status(400).json({ message: "Loan type is required" });
    }

    if (!duration || duration <= 0) {
      return res.status(400).json({ message: "Invalid duration" });
    }

    const numericAmount = Number(amount); // ✅ FIX — ensure number

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid loan amount" });
    }

    const activeLoan = await Loan.findOne({
      userId: req.user.id,
      status: { $in: ["pending", "approved"] }
    });

    if (activeLoan) {
      return res.status(400).json({
        message: "You already have an active loan."
      });
    }

    const interestRate = 0.10;
    const interestAmount = numericAmount * interestRate;
    const totalRepayment = numericAmount + interestAmount;

    const loan = await Loan.create({
      userId: req.user.id,
      loanType: loan_type, // ✅ FIX — must match schema
      amount: numericAmount,
      duration,
      interestRate,
      interestAmount,
      totalRepayment,
      status: "pending"
    });

    await Notification.create({
      user: req.user.id,
      title: "Loan Submitted",
      message: `Your loan request of $${numericAmount} is under review.`,
      type: "loan"
    });

    res.json({ message: "Loan submitted successfully", loan });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   ================= ADMIN LOAN APPROVAL =================
   ====================================================== */

app.put("/api/admin/loan/:id", authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    if (loan.status === "approved" && status === "approved") {
      return res.status(400).json({ message: "Loan already approved" });
    }

    loan.status = status;
    await loan.save();

    const user = await User.findById(loan.userId);

    if (status === "approved") {
      user.availableBalance += loan.amount;
      user.outstandingBalance += loan.totalRepayment || loan.amount; // ✅ FIX fallback

      await user.save();

      await Notification.create({
        user: loan.userId,
        title: "Loan Approved",
        message: `Your ${loan.loanType} loan has been approved.`,
        type: "loan"
      });
    }

    if (status === "rejected") {
      await Notification.create({
        user: loan.userId,
        title: "Loan Rejected",
        message: `Your ${loan.loanType} loan was rejected.`,
        type: "loan"
      });
    }

    res.json({ message: "Loan updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   ================= WITHDRAW REQUEST ===================
   ====================================================== */

app.post("/api/withdraw", authenticateToken, async (req, res) => {
  try {

    const { amount } = req.body;
    const numericAmount = Number(amount); // ✅ FIX

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.kyc_status !== "approved") {
      return res.status(403).json({
        message: "KYC approval required before withdrawal."
      });
    }

    if (user.availableBalance < numericAmount) {
      return res.status(400).json({
        message: "Insufficient available balance."
      });
    }

    const activeWithdraw = await Withdrawal.findOne({
      userId: user._id,
      status: { $in: ["processing", "fee_required", "verification_hold"] }
    });

    if (activeWithdraw) {
      return res.status(400).json({
        message: "You already have an active withdrawal."
      });
    }

    const withdrawal = await Withdrawal.create({
      userId: user._id,
      amount: numericAmount,
      status: "processing",
      progress: 0,
      fee_paid: false,
      admin_verified: false
    });

    await Notification.create({
      user: user._id,
      title: "Withdrawal Submitted",
      message: `Your withdrawal of $${numericAmount} is now processing.`,
      type: "withdraw"
    });

    res.json({
      message: "Withdrawal started successfully",
      withdrawal
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   ================= DASHBOARD ==========================
   ====================================================== */

app.get("/api/dashboard", authenticateToken, async (req, res) => {
  try {

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const loans = await Loan.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    const withdrawals = await Withdrawal.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    const notifications = await Notification.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

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
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});