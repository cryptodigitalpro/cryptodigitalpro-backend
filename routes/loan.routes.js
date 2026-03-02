const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const loanController = require("../controllers/loan.controller");

router.post("/apply", protect, loanController.applyLoan);

module.exports = router;