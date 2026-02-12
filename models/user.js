/* =====================================
   USER MODEL
===================================== */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    kyc_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    balance: {
      type: Number,
      default: 0
    }

  },
  {
    timestamps: true
  }
);

/* =====================================
   HASH PASSWORD BEFORE SAVE
===================================== */

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

/* =====================================
   PASSWORD COMPARE METHOD
===================================== */

userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

reset_token: String,
reset_token_expiry: Date
