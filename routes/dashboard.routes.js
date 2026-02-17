const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const dashboardController = require("../controllers/dashboard.controller");

router.get("/", authenticateToken, dashboardController.getDashboard);

module.exports = router;