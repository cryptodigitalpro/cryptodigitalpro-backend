const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

// ============================
// 1️⃣ CREATE WITHDRAWAL
// ============================

router.post("/", async (req, res) => {
  try {
    const { amount, walletAddress, network } = req.body;
    const user = req.user;

    if (!user.kycVerified)
      return res.status(403).json({ message: "KYC required" });

    const dbUser = await User.findById(user.id);

    if (dbUser.availableBalance < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    const active = await Withdrawal.findOne({
      userId: user.id,
      status: {
        $in: [
          "pending",
          "broadcast_hold",
          "compliance_hold"
        ]
      }
    });

    if (active)
      return res.status(400).json({ message: "Withdrawal already in progress" });

    const withdrawal = await Withdrawal.create({
      userId: user.id,
      amount,
      walletAddress,
      network
    });

    res.json({
      message: "Withdrawal initiated",
      withdrawal
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// 2️⃣ LOCK BROADCAST (47%)
// ============================

router.put("/:id/lock-broadcast", async (req, res) => {
  const withdrawal = await Withdrawal.findById(req.params.id);

  if (!withdrawal || withdrawal.userId.toString() !== req.user.id)
    return res.sendStatus(403);

  if (withdrawal.status !== "pending")
    return res.status(400).json({ message: "Invalid stage" });

  withdrawal.status = "broadcast_hold";
  await withdrawal.save();

  res.json({ message: "Waiting for admin broadcast approval" });
});

// ============================
// 3️⃣ MOVE TO COMPLIANCE (73%)
// ============================

router.put("/:id/move-to-compliance", async (req, res) => {

  const withdrawal = await Withdrawal.findById(req.params.id);

  if (!withdrawal || withdrawal.userId.toString() !== req.user.id)
    return res.sendStatus(403);

  if (withdrawal.status !== "broadcast_approved")
    return res.status(400).json({ message: "Admin approval required" });

  withdrawal.status = "compliance_hold";
  await withdrawal.save();

  res.json({ message: "Compliance review required" });
});

// ============================
// 4️⃣ FINALIZE (100%)
// ============================

router.put("/:id/finalize", async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const withdrawal = await Withdrawal.findById(req.params.id).session(session);

    if (!withdrawal || withdrawal.userId.toString() !== req.user.id)
      throw new Error("Unauthorized");

    if (withdrawal.status !== "compliance_approved")
      throw new Error("Compliance approval required");

    const user = await User.findById(req.user.id).session(session);

    if (user.availableBalance < withdrawal.amount)
      throw new Error("Insufficient balance");

    user.availableBalance -= withdrawal.amount;
    await user.save({ session });

    withdrawal.status = "completed";
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Withdrawal completed" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});
rejectionReason: {
  type: String,
  default: null
},

module.exports = router;
