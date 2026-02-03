fee_paid: {
  type: Boolean,
  default: false
},
status: {
  type: String,
  enum: [
    "pending",
    "approved",
    "processing",
    "fee_required",
    "verification_hold",
    "completed",
    "rejected"
  ],
  default: "pending"
},
progress: {
  type: Number,
  default: 0
}
