const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({

  full_name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },

  password: {
    type: String,
    required: false, // allow Google users
    minlength: 6,
    select: false // DO NOT return password by default
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    index: true
  },

  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  depositedBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  outstandingBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  withdrawnBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  kyc_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true
  },

  account_status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active"
  },

  reset_token: {
    type: String,
    select: false
  },

  reset_token_expires: {
    type: Date,
    select: false
  }

}, { timestamps: true });



/* ==============================
   PASSWORD HASHING MIDDLEWARE
================================= */

userSchema.pre("save", async function (next) {

  if (!this.isModified("password")) return next();

  // Skip hashing if password empty (Google login)
  if (!this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});


/* ==============================
   PASSWORD COMPARE METHOD
================================= */

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};


/* ==============================
   GENERATE JWT TOKEN
================================= */

userSchema.methods.generateAuthToken = function () {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(
    {
      id: this._id,
      role: this.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
};


/* ==============================
   SAFE JSON OUTPUT
   Removes sensitive fields
================================= */

userSchema.methods.toJSON = function () {
  const userObject = this.toObject();

  delete userObject.password;
  delete userObject.reset_token;
  delete userObject.reset_token_expires;

  return userObject;
};


module.exports = mongoose.model("User", userSchema);