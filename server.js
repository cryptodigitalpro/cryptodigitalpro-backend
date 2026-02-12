/* =====================================
   CRYPTO DIGITAL PRO BACKEND SERVER
   Production Ready
===================================== */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const authMiddleware = require("./middleware/auth");
const adminMiddleware = require("./middleware/admin");

const User = require("./models/User");
const Loan = require("./models/Loan");
const Notification = require("./models/Notification");

const app = express();
const server = http.createServer(app);

/* =====================================
   CONFIG
===================================== */

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-netlify-site.netlify.app"
    ],
    credentials: true
  })
);

/* =====================================
   SOCKET.IO
===================================== */

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
  });
});

/* =====================================
   DATABASE
===================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

/* =====================================
   HEALTH CHECK
===================================== */

app.get("/", (req, res) => {
  res.json({ status: "API running" });
});

/* =====================================
   APPLY LOAN
===================================== */

app.post("/api/loans/apply", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.kyc_status !== "approved") {
      return res.status(403).json({
        error: "KYC approval required before loan application"
      });
    }

    const { loan_type, amount, duration, purpose, metadata } = req.body;

    if (!loan_type || !amount || !duration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newLoan = await Loan.create({
      user: user._id,
      loan_type,
      amount,
      duration,
      purpose,
      metadata,
      status: "pending",
      remaining_balance: 0
    });

    res.status(201).json({
      message: "Loan application submitted",
      loan: newLoan
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================
   ADMIN APPROVE / REJECT
===================================== */

app.patch(
  "/api/admin/loans/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { action, reason } = req.body;
      const loan = await Loan.findById(req.params.id).populate("user");

      if (!loan) return res.status(404).json({ error: "Loan not found" });

      if (action === "approve") {
        loan.status = "approved";
        loan.remaining_balance = loan.amount;

        await loan.save();

        const notification = await Notification.create({
          user: loan.user._id,
          title: "Loan Approved",
          message: "Your loan has been approved successfully.",
          type: "loan"
        });

        io.to(loan.user._id.toString()).emit(
          "new_notification",
          notification
        );

      } else if (action === "reject") {
        loan.status = "rejected";
        loan.rejection_reason = reason || "No reason provided";

        await loan.save();

      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      res.json({ message: `Loan ${action}d successfully`, loan });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* =====================================
   GET USER LOANS
===================================== */

app.get("/api/loans/my", authMiddleware, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================
   REPAY LOAN
===================================== */

app.post("/api/loans/:id/repay", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const loan = await Loan.findById(req.params.id);

    if (!loan) return res.status(404).json({ error: "Loan not found" });

    if (loan.user.toString() !== req.user.id)
      return res.status(403).json({ error: "Unauthorized" });

    if (loan.status !== "approved")
      return res.status(400).json({ error: "Loan not active" });

    if (amount <= 0 || amount > loan.remaining_balance)
      return res.status(400).json({ error: "Invalid amount" });

    loan.repayments.push({ amount });
    loan.remaining_balance -= amount;

    if (loan.remaining_balance === 0) {
      loan.status = "paid";
    }

    await loan.save();

    res.json({ message: "Repayment successful", loan });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================
   NOTIFICATIONS
===================================== */

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================
   START SERVER
===================================== */

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
