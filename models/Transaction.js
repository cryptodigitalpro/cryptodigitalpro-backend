const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
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
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
    index: true
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction" // optional internal link
  },

  externalReference: {
    type: String, // for payment gateway ID
    trim: true
  },

  balanceBefore: {
    type: Number,
    min: 0
  },

  balanceAfter: {
    type: Number,
    min: 0
  },

  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // admin who approved
  },

  note: {
    type: String,
    trim: true,
    maxlength: 500
  }

}, { timestamps: true });



/* ============================
   PREVENT MODIFICATION AFTER APPROVAL
============================ */

transactionSchema.pre("save", function (next) {

  if (!this.isNew && this.isModified("amount")) {
    return next(new Error("Transaction amount cannot be modified"));
  }

  next();
});


/* ============================
   INDEX FOR FAST HISTORY QUERY
============================ */

transactionSchema.index({ userId: 1, createdAt: -1 });



module.exports = mongoose.model("Transaction", transactionSchema);