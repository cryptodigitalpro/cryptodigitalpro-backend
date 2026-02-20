const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // FIXED (must match model name)
    required: true
  },

  loanType: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  duration: {
    type: Number,
    required: true
  },

  interestRate: Number,
  interestAmount: Number,
  totalRepayment: Number,

  adminNotes: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["pending", "review", "approved", "rejected"],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Loan", loanSchema);