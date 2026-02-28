const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { protect } = require("../middleware/auth");

const Withdrawal = require("../models/withdrawal");
const User = require("../models/user");



/* ============================
   1️⃣ CREATE WITHDRAWAL
============================ */

router.post("/", protect, async (req, res) => {
  try {
    const { amount, walletAddress, network } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    if (!walletAddress || !network)
      return res.status(400).json({ message: "Wallet and network required" });

    const dbUser = await User.findById(req.user.id);

    if (!dbUser)
      return res.status(404).json({ message: "User not found" });

    if (dbUser.kyc_status !== "approved")
      return res.status(403).json({ message: "KYC approval required" });

    if (dbUser.availableBalance < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    const active = await Withdrawal.findOne({
      userId: req.user.id,
      status: { $in: ["pending", "broadcast_hold", "compliance_hold"] }
    });

    if (active)
      return res.status(400).json({ message: "Withdrawal already in progress" });

    const withdrawal = await Withdrawal.create({
      userId: req.user.id,
      amount,
      walletAddress,
      network,
      status: "pending"
    });

    res.json({
      message: "Withdrawal initiated",
      withdrawal
    });

  } catch (err) {
    console.error("Create withdrawal error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



/* ============================
   2️⃣ LOCK BROADCAST
============================ */

router.put("/:id/lock-broadcast", protect, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal || withdrawal.userId.toString() !== req.user.id)
      return res.sendStatus(403);

    if (withdrawal.status !== "pending")
      return res.status(400).json({ message: "Invalid stage" });

    withdrawal.status = "broadcast_hold";
    await withdrawal.save();

    res.json({ message: "Waiting for admin broadcast approval" });

  } catch (err) {
    console.error("Lock broadcast error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



/* ============================
   3️⃣ MOVE TO COMPLIANCE
============================ */

router.put("/:id/move-to-compliance", protect, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal || withdrawal.userId.toString() !== req.user.id)
      return res.sendStatus(403);

    if (withdrawal.status !== "broadcast_approved")
      return res.status(400).json({ message: "Admin approval required" });

    withdrawal.status = "compliance_hold";
    await withdrawal.save();

    res.json({ message: "Compliance review required" });

  } catch (err) {
    console.error("Compliance move error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



/* ============================
   4️⃣ FINALIZE (Atomic Safe)
============================ */

router.put("/:id/finalize", protect, async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const withdrawal = await Withdrawal.findById(req.params.id).session(session);

    if (!withdrawal || withdrawal.userId.toString() !== req.user.id)
      throw new Error("Unauthorized");

    if (withdrawal.status !== "compliance_approved")
      throw new Error("Compliance approval required");

    const user = await User.findById(req.user.id).session(session);

    if (!user)
      throw new Error("User not found");

    if (user.availableBalance < withdrawal.amount)
      throw new Error("Insufficient balance");

    user.availableBalance -= withdrawal.amount;
    user.withdrawnBalance += withdrawal.amount;

    await user.save({ session });

    withdrawal.status = "completed";
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Withdrawal completed" });

  } catch (err) {

    await session.abortTransaction();
    session.endSession();

    console.error("Finalize withdrawal error:", err);
    res.status(400).json({ message: err.message });
  }
});



module.exports = router;