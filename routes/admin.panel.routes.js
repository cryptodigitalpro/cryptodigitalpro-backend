const express = require("express");
const router = express.Router();

const User = require("../models/user");
const Loan = require("../models/loan");
const Withdrawal = require("../models/withdrawal");
const Notification = require("../models/notification");

/* ================= ADMIN CHECK ================= */

function adminOnly(req,res,next){
  if(req.user.role !== "admin")
    return res.status(403).json({message:"Admin only"});
  next();
}

router.use(adminOnly);

/* ================= USERS ================= */

router.get("/admin/users", async (req,res)=>{
  const users = await User.find().select("-password");
  res.json(users);
});

/* ================= KYC APPROVAL ================= */

router.patch("/admin/verify/:id", async (req,res)=>{
  const {status} = req.body;

  if(!["approved","rejected"].includes(status))
    return res.status(400).json({message:"Invalid status"});

  const user = await User.findById(req.params.id);
  if(!user) return res.status(404).json({message:"User not found"});

  user.kyc_status = status;
  await user.save();

  await Notification.create({
    user:user._id,
    title:`KYC ${status}`,
    message:`Your verification was ${status}`,
    type:"verification"
  });

  res.json({message:"KYC updated"});
});

/* ================= LOANS ================= */

router.get("/admin/loans", async (req,res)=>{
  const loans = await Loan.find().populate("userId","email name");
  res.json(loans);
});

router.patch("/admin/loan/:id", async (req,res)=>{
  const {status} = req.body;

  const loan = await Loan.findById(req.params.id);
  if(!loan) return res.status(404).json({message:"Loan not found"});

  loan.status = status;
  await loan.save();

  res.json({message:"Loan updated"});
});

/* ================= WITHDRAWALS ================= */

router.get("/admin/withdrawals", async (req,res)=>{
  const list = await Withdrawal.find().populate("userId","email name");
  res.json(list);
});

router.patch("/admin/withdraw/:id", async (req,res)=>{
  const {status} = req.body;

  const withdrawal = await Withdrawal.findById(req.params.id);
  if(!withdrawal) return res.status(404).json({message:"Not found"});

  withdrawal.status = status;
  await withdrawal.save();

  res.json({message:"Withdrawal updated"});
});

/* ================= DOCUMENT VIEW ================= */

router.get("/admin/user-docs/:id", async (req,res)=>{
  const user = await User.findById(req.params.id);

  res.json({
    id:user.idDocument,
    address:user.addressDocument
  });
});

module.exports = router;