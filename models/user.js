const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
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

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
     
	 availableBalance: {
  type: Number,
  default: 0
}
    kyc_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    reset_token: {
      type: String
    },

    reset_token_expiry: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("user", userSchema);
