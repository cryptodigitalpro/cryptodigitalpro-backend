const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  full_name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  availableBalance: {
    type: Number,
    default: 0
  },

  depositedBalance: {
    type: Number,
    default: 0
  },

  outstandingBalance: {
    type: Number,
    default: 0
  },

  withdrawnBalance: {
    type: Number,
    default: 0
  },

  kyc_status: {   // ✅ comma before this field
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
