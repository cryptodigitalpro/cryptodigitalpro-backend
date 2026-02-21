const express = require("express");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Notification = require("../models/notification");

/* ================= MULTER CONFIG ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* ================= UPDATE PROFILE ================= */

router.patch("/user/profile", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;

    await user.save();

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= AVATAR UPLOAD ================= */

router.post("/user/avatar", upload.single("avatar"), async (req, res) => {
  try {

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatar = "/uploads/" + req.file.filename;
    await user.save();

    res.json({
      message: "Avatar uploaded",
      avatar: user.avatar
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= CHANGE PASSWORD ================= */

router.patch("/user/password", async (req, res) => {
  try {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match)
      return res.status(400).json({ message: "Old password incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= TOGGLE 2FA ================= */

router.post("/user/2fa/toggle", async (req, res) => {
  try {

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.json({
      message: user.twoFactorEnabled
        ? "2FA Enabled"
        : "2FA Disabled"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= UPLOAD ID ================= */

router.post("/verify/id", upload.single("file"), async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    user.idDocument = "/uploads/" + req.file.filename;
    user.kyc_status = "pending";

    await user.save();

    await Notification.create({
      user: user._id,
      title: "ID Uploaded",
      message: "Your ID document is under review.",
      type: "verification"
    });

    res.json({ message: "ID uploaded successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= UPLOAD ADDRESS ================= */

router.post("/verify/address", upload.single("file"), async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    user.addressDocument = "/uploads/" + req.file.filename;
    user.kyc_status = "pending";

    await user.save();

    res.json({ message: "Address proof uploaded" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= USER DOCUMENTS ================= */

router.get("/user/documents", async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    res.json([
      { type: "ID Document", url: user.idDocument },
      { type: "Address Proof", url: user.addressDocument }
    ].filter(d => d.url));

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load documents" });
  }
});

/* ================= SUPPORT TICKET ================= */

router.post("/support/ticket", async (req, res) => {
  try {

    const { message } = req.body;

    await Notification.create({
      user: req.user.id,
      title: "Support Request Sent",
      message,
      type: "support"
    });

    res.json({ message: "Support request sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Support failed" });
  }
});

module.exports = router;