const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboard.controller");

router.get("/", protect, dashboardController.getDashboard);

module.exports = router;