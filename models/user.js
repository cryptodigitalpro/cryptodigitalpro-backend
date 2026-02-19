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
    required: false   // allow Google users without password
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
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

  kyc_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  reset_token: {
    type: String
  },

  reset_token_expires: {
    type: Date
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
