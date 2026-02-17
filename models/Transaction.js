const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  type: {
    type: String,
    enum: [
      "deposit",
      "withdrawal",
      "loan_credit",
      "repayment",
      "admin_adjustment"
    ],
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },

  note: String

}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);