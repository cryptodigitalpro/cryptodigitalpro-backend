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
      "processing",
      "fee_required",
      "verification_hold",
      "broadcast_hold",
      "broadcast_approved",
      "compliance_hold",
      "compliance_approved",
      "completed",
      "rejected"
    ],
    default: "pending"
  },

  progress: {
    type: Number,
    default: 0
  },

  fee_paid: {
    type: Boolean,
    default: false
  },

  admin_verified: {
    type: Boolean,
    default: false
  },

  rejectionReason: {
    type: String,
    default: null,
    trim: true
  }

}, { timestamps: true });

module.exports = mongoose.model("withdrawal", withdrawalSchema);