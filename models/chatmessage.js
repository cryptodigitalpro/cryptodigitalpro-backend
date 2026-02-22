const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  message: {
    type: String
  },

  fileUrl: {
    type: String
  },

  read: {
    type: Boolean,
    default: false
  },

  isAdminMessage: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }

});

/* ================= INDEXES ================= */

// Fast chat history lookup
chatMessageSchema.index({ room: 1, createdAt: -1 });

// Optional: unread lookup optimization
chatMessageSchema.index({ receiver: 1, read: 1 });

module.exports = mongoose.model("chatmessage", chatMessageSchema);