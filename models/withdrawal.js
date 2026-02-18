const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  walletAddress: {
    type: String,
    required: true,
    trim: true
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
  },

  rejectionReason: {
    type: String,
    default: null,
    trim: true
  }

}, { timestamps: true });

module.exports = mongoose.model("withdrawal", withdrawalSchema);
