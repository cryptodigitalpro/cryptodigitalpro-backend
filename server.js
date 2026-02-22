require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const multer = require("multer");
const path = require("path");
const { Server } = require("socket.io");
const compression = require("compression");

const authRoutes = require("./routes/auth.routes");
const adminWithdrawRoutes = require("./routes/admin.withdraw.routes");
const settingsRoutes = require("./routes/user.settings.routes");
const adminPanel = require("./routes/admin.panel.routes");

const ChatMessage = require("./models/chatmessage");
const User = require("./models/user");
const Loan = require("./models/loan");
const Withdrawal = require("./models/withdrawal");
const Notification = require("./models/notification");

const app = express();
app.use(compression());
const PORT = process.env.PORT || 5000;

/* ================= DATABASE ================= */

mongoose.set("strictQuery", true);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("Mongo Error:", err);
    process.exit(1);
  });

/* ================= MIDDLEWARE ================= */

app.use(express.json());
app.set("trust proxy", 1);
app.disable("x-powered-by");

/* ================= SECURITY HEADERS ================= */

app.use((req,res,next)=>{

res.setHeader("Content-Security-Policy",`
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdn.socket.io;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://cryptodigitalpro-api.onrender.com https://api.cryptodigitalpro.com wss://api.cryptodigitalpro.com;
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
form-action 'self';
`.replace(/\n/g," "));

res.setHeader("X-Content-Type-Options","nosniff");
res.setHeader("X-Frame-Options","DENY");
res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains; preload");

next();
});

/* ================= CORS ================= */

app.use(cors({
  origin:[
    "https://cryptodigitalpro.com",
    "https://www.cryptodigitalpro.com"
  ],
  credentials:true
}));

app.use("/uploads", express.static("uploads"));

/* ================= AUTH ================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message:"Unauthorized" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message:"Invalid token" });
    req.user = decoded;
    next();
  });
}

/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null,"uploads/"),
  filename: (req,file,cb)=> cb(null, Date.now()+"-"+file.originalname)
});

const upload = multer({ storage });

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/admin/withdraw", authenticateToken, adminWithdrawRoutes);
app.use("/api", authenticateToken, settingsRoutes);
app.use("/api", authenticateToken, adminPanel);

/* ================= CHAT FILE UPLOAD ================= */

app.post("/api/chat/upload", authenticateToken, upload.single("file"), (req,res)=>{
  res.json({ fileUrl:`/uploads/${req.file.filename}` });
});

/* ================= ADMIN ALERT ================= */

async function notifyAdmins(title,message){
  try{
    const admins = await User.find({ role:"admin" });
    for(const admin of admins){
      await Notification.create({
        user: admin._id,
        title,
        message,
        type:"admin_alert"
      });
    }
  }catch(err){
    console.error("Admin notify error:",err);
  }
}

/* ================= APPLY LOAN ================= */

app.post("/api/loan/apply", authenticateToken, async (req,res)=>{
try{

  const { loan_type, amount, duration } = req.body;

  if(!loan_type)
    return res.status(400).json({ message:"Loan type is required" });

  if(!duration || duration<=0)
    return res.status(400).json({ message:"Invalid duration" });

  const numericAmount = Number(amount);

  if(!numericAmount || numericAmount<=0)
    return res.status(400).json({ message:"Invalid loan amount" });

  const activeLoan = await Loan.findOne({
    userId:req.user.id,
    status:{ $in:["pending","approved"] }
  });

  if(activeLoan)
    return res.status(400).json({ message:"You already have an active loan." });

  const interestRate=0.10;
  const interestAmount=numericAmount*interestRate;
  const totalRepayment=numericAmount+interestAmount;

  const loan = await Loan.create({
    userId:req.user.id,
    loanType:loan_type,
    amount:numericAmount,
    duration,
    interestRate,
    interestAmount,
    totalRepayment,
    status:"pending"
  });

  await Notification.create({
    user:req.user.id,
    title:"Loan Submitted",
    message:`Your loan request of $${numericAmount} is under review.`,
    type:"loan"
  });

  sendRealtime(req.user.id,"loan_update",{
    message:"Loan submitted successfully",
    status:"pending"
  });

  await notifyAdmins(
    "New Loan Application",
    `User ${req.user.id} applied for $${numericAmount}`
  );

  res.json({ message:"Loan submitted successfully", loan });

}catch(err){
  console.error(err);
  res.status(500).json({ message:"Server error" });
}
});

/* ================= ADMIN LOAN UPDATE ================= */

app.put("/api/admin/loan/:id", authenticateToken, async (req,res)=>{
try{

  if(req.user.role!=="admin")
    return res.status(403).json({ message:"Access denied" });

  const { status } = req.body;

  if(!["approved","rejected"].includes(status))
    return res.status(400).json({ message:"Invalid status" });

  const loan = await Loan.findById(req.params.id);
  if(!loan) return res.status(404).json({ message:"Loan not found" });

  if(loan.status==="approved" && status==="approved")
    return res.status(400).json({ message:"Loan already approved" });

  loan.status=status;
  await loan.save();

  const user = await User.findById(loan.userId);

  if(status==="approved"){
    user.availableBalance += loan.amount;
    user.outstandingBalance += loan.totalRepayment || loan.amount;
    await user.save();

    await Notification.create({
      user:loan.userId,
      title:"Loan Approved",
      message:`Your ${loan.loanType} loan has been approved.`,
      type:"loan"
    });

    sendRealtime(loan.userId,"loan_update",{ status:"approved" });
  }

  if(status==="rejected"){
    await Notification.create({
      user:loan.userId,
      title:"Loan Rejected",
      message:`Your ${loan.loanType} loan was rejected.`,
      type:"loan"
    });

    sendRealtime(loan.userId,"loan_update",{ status:"rejected" });
  }

  res.json({ message:"Loan updated successfully" });

}catch(err){
  console.error(err);
  res.status(500).json({ message:"Server error" });
}
});

/* ================= WITHDRAW ================= */

app.post("/api/withdraw", authenticateToken, async (req,res)=>{
try{

  const numericAmount = Number(req.body.amount);

  if(!numericAmount || numericAmount<=0)
    return res.status(400).json({ message:"Invalid withdrawal amount" });

  const user = await User.findById(req.user.id);
  if(!user) return res.status(404).json({ message:"User not found" });

  if(user.kyc_status!=="approved")
    return res.status(403).json({ message:"KYC approval required before withdrawal." });

  if(user.availableBalance < numericAmount)
    return res.status(400).json({ message:"Insufficient balance." });

  const activeWithdraw = await Withdrawal.findOne({
    userId:user._id,
    status:{ $in:["processing","fee_required","verification_hold"] }
  });

  if(activeWithdraw)
    return res.status(400).json({ message:"You already have an active withdrawal." });

  const withdrawal = await Withdrawal.create({
    userId:user._id,
    amount:numericAmount,
    status:"processing",
    progress:0,
    fee_paid:false,
    admin_verified:false
  });

  await Notification.create({
    user:user._id,
    title:"Withdrawal Submitted",
    message:`Your withdrawal of $${numericAmount} is now processing.`,
    type:"withdraw"
  });

  sendRealtime(user._id,"withdraw_update",{ status:"processing" });

  await notifyAdmins(
    "New Withdrawal Request",
    `User ${user._id} requested $${numericAmount}`
  );

  res.json({ message:"Withdrawal started successfully", withdrawal });

}catch(err){
  console.error(err);
  res.status(500).json({ message:"Server error" });
}
});

/* ================= DASHBOARD ================= */

app.get("/api/dashboard", authenticateToken, async (req,res)=>{
try{

  const user = await User.findById(req.user.id);
  if(!user) return res.status(404).json({ message:"User not found" });

  const loans = await Loan.find({ userId:req.user.id }).sort({createdAt:-1}).lean();
  const withdrawals = await Withdrawal.find({ userId:req.user.id }).sort({createdAt:-1}).lean();
  const notifications = await Notification.find({ user:req.user.id }).sort({createdAt:-1}).lean();

  res.json({
    balances:{
      deposited:user.depositedBalance||0,
      available:user.availableBalance||0,
      outstanding:user.outstandingBalance||0,
      withdrawn:user.withdrawnBalance||0
    },
    loans,
    withdrawals,
    notifications
  });

}catch(err){
  console.error(err);
  res.status(500).json({ message:"Server error" });
}
});

/* ================= SERVER ================= */

const server = app.listen(PORT,()=>{
  console.log(`🚀 Server running on port ${PORT}`);
});

const io = new Server(server,{
  cors:{
    origin:[
      "https://cryptodigitalpro.com",
      "https://www.cryptodigitalpro.com"
    ],
    methods:["GET","POST"]
  }
});

const onlineUsers = new Map();

io.on("connection",(socket)=>{

  socket.on("register",(userId)=>{
    onlineUsers.set(String(userId),socket.id);
  });

  socket.on("joinRoom",({userId,targetUserId})=>{
    const room=[userId,targetUserId].sort().join("_");
    socket.join(room);
  });

  socket.on("disconnect",()=>{
    for(const [id,sid] of onlineUsers.entries()){
      if(sid===socket.id){
        onlineUsers.delete(id);
        break;
      }
    }
  });

});

/* ================= REALTIME HELPER ================= */

function sendRealtime(userId,event,data){
  const socketId = onlineUsers.get(String(userId));
  if(socketId){
    io.to(socketId).emit(event,data);
  }
}

app.get("/api/withdraw", authenticateToken, async (req,res)=>{
try{
const withdrawal = await Withdrawal.findOne({
userId:req.user.id
}).sort({createdAt:-1});

res.json({ withdrawal });

}catch(err){
console.error(err);
res.status(500).json({message:"Server error"});
}
});