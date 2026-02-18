const express = require("express");
const router = express.Router();

const Withdrawal = require("../models/withdrawal");

// ============================
// ADMIN LIST ALL WITHDRAWALS
// ============================

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .populate("userId", "email")
      .sort({ createdAt: -1 });

    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// ADMIN BROADCAST APPROVAL
// ============================

router.put("/:id/broadcast-approve", async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.sendStatus(403);

    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal)
      return res.sendStatus(404);

    if (withdrawal.status !== "broadcast_hold")
      return res.status(400).json({ message: "Invalid stage" });

    withdrawal.status = "broadcast_approved";
    await withdrawal.save();

    res.json({ message: "Broadcast approved" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// ADMIN COMPLIANCE APPROVAL
// ============================

router.put("/:id/compliance-approve", async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.sendStatus(403);

    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal)
      return res.sendStatus(404);

    if (withdrawal.status !== "compliance_hold")
      return res.status(400).json({ message: "Invalid stage" });

    withdrawal.status = "compliance_approved";
    await withdrawal.save();

    res.json({ message: "Compliance approved" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// ADMIN REJECT WITHDRAWAL
// ============================

router.put("/:id/reject", async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.sendStatus(403);

    const { reason } = req.body;

    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal)
      return res.sendStatus(404);

    if (withdrawal.status === "completed")
      return res.status(400).json({ message: "Cannot reject completed withdrawal" });

    withdrawal.status = "rejected";
    withdrawal.rejectionReason = reason || "Rejected by admin";

    await withdrawal.save();

    res.json({ message: "Withdrawal rejected successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
