const express = require("express");
const router = express.Router();
const User = require("../models/user");  // Correct import for MongoDB model
const auth = require("../middleware/auth");  // Assuming your authentication middleware

// Route to handle KYC upload
router.post("/kyc", auth, async (req, res) => {
  try {
    const filePath = req.file.path;  // Assuming file upload handled by multer or similar

    // Find the user and update their KYC status and file path
    const user = await User.findByIdAndUpdate(
      req.user.id,  // Use req.user.id from the auth middleware
      {
        kyc_status: "pending",
        kyc_file: filePath
      },
      { new: true }  // Return updated user
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
