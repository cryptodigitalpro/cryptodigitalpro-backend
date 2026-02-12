const mongoose = require("mongoose");

const repaymentSchema = new mongoose.Schema({
  amount: Number,
  paid_at: {
    type: Date,
    default: Date.now
  }
});

const loanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    loan_type: {
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

    purpose: String,

    metadata: Object,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending"
    },

    repayments: [repaymentSchema],

    remaining_balance: {
      type: Number,
      required: true
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);
