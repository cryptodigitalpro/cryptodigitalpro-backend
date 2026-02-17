const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const loanController = require("../controllers/loan.controller");

router.post("/apply", authenticateToken, loanController.applyLoan);

module.exports = router;