const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  walletAddress: {
    type: String,
    required: true
  },

  network: {
    type: String,
    enum: ["TRC20", "BTC"],
    required: true
  },

  status: {
    type: String,
    enum: [
      "pending",
      "broadcast_hold",
      "broadcast_approved",
      "compliance_hold",
      "compliance_approved",
      "completed",
      "rejected"
    ],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Withdrawal", withdrawalSchema);