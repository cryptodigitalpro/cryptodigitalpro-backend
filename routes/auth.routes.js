const express = require("express");

const login = require("../api/login");
const register = require("../api/register");
const forgotPassword = require("../api/forgotPassword");
const googleLogin = require("../api/google");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/google", googleLogin);

module.exports = router;
