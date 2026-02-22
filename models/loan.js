const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },   // ✅ THIS COMMA IS REQUIRED

  loanType: {
    type: String,
    required: true,
    trim: true
  },

  amount: {
    type: Number,
    required: true,
    min: 1
  },

  duration: {
    type: Number,
    required: true,
    min: 1
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "paid"],
    default: "pending"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Loan", loanSchema);