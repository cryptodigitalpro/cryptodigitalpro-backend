require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const { Server } = require("socket.io");
const compression = require("compression");

/* ================= APP INIT ================= */

const app = express();
const PORT = process.env.PORT || 5000;

/* ================= ROOT CHECK ================= */

app.get("/", (req, res) => {
  res.json({ status: "API is running 🚀" });
});

/* ================= ROUTES IMPORT ================= */

const authRoutes = require("./routes/auth.routes");
const loanRoutes = require("./routes/loan.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const withdrawRoutes = require("./routes/withdraw.routes");
const adminWithdrawRoutes = require("./routes/admin.withdraw.routes");
const settingsRoutes = require("./routes/user.settings.routes");
const adminPanelRoutes = require("./routes/admin.panel.routes");

/* ================= MODELS ================= */

const User = require("./models/user");
const Notification = require("./models/notification");

/* ================= AUTH MIDDLEWARE ================= */

const { protect } = require("./middleware/auth");

/* ================= GLOBAL CONFIG ================= */

app.set("trust proxy", 1);
app.disable("x-powered-by");

/* ================= CORS ================= */

app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://your-netlify-site.netlify.app",
    "https://cryptodigitalpro.com"
  ],
  credentials: true
}));

/* ================= MIDDLEWARE ================= */

app.use(express.json({ limit: "10mb" }));
app.use(compression());

/* ================= DATABASE ================= */

mongoose.set("strictQuery", true);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
  console.error("❌ Mongo Error:", err);
  process.exit(1);
});

/* ================= SECURITY HEADERS ================= */

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    `
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdn.socket.io https://accounts.google.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src https://fonts.gstatic.com;
    img-src 'self' data: https://accounts.google.com;
    connect-src 'self' https://api.cryptodigitalpro.com https://accounts.google.com wss://api.cryptodigitalpro.com;
    frame-src https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    frame-ancestors 'none';
    form-action 'self';
  `.replace(/\n/g, " ")
  );

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  next();
});

/* ================= STATIC FILES ================= */

app.use("/uploads", express.static("uploads"));

/* ================= MULTER CONFIG ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* ================= API ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/loan", protect, loanRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/withdraw", protect, withdrawRoutes);
app.use("/api/admin/withdraw", protect, adminWithdrawRoutes);
app.use("/api/settings", protect, settingsRoutes);
app.use("/api/admin", protect, adminPanelRoutes);

/* ================= CHAT FILE UPLOAD ================= */

app.post(
  "/api/chat/upload",
  protect,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({ fileUrl: `/uploads/${req.file.filename}` });
  }
);

/* ================= SERVER START ================= */

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/* ================= SOCKET.IO ================= */

const io = new Server(server, {
  cors: {
    origin: [
      "https://cryptodigitalpro.com",
      "https://www.cryptodigitalpro.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* ================= USER SOCKET MAP ================= */

const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    if (!userId) return;

    const id = String(userId);

    if (!onlineUsers.has(id)) {
      onlineUsers.set(id, new Set());
    }

    onlineUsers.get(id).add(socket.id);
  });

  socket.on("joinRoom", ({ userId, targetUserId }) => {
    const room = [userId, targetUserId].sort().join("_");
    socket.join(room);
  });

  socket.on("ping", () => socket.emit("pong"));

  socket.on("disconnect", () => {
    for (const [uid, set] of onlineUsers.entries()) {
      set.delete(socket.id);
      if (set.size === 0) onlineUsers.delete(uid);
    }
  });
});

/* ================= REALTIME HELPER ================= */

function sendRealtime(userId, event, data) {
  const sockets = onlineUsers.get(String(userId));
  if (!sockets) return;

  for (const id of sockets) {
    io.to(id).emit(event, data);
  }
}

/* ================= ADMIN NOTIFY ================= */

async function notifyAdmins(title, message) {
  try {
    const admins = await User.find({ role: "admin" });

    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title,
        message,
        type: "admin_alert"
      });
    }
  } catch (err) {
    console.error("Admin notify error:", err);
  }
}