/* =====================================
   CRYPTO DIGITAL PRO BACKEND SERVER
   Production Ready (Render Stable)
===================================== */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/* =====================================
   PORT (REQUIRED FOR RENDER)
===================================== */
const PORT = process.env.PORT || 5000;

/* =====================================
   MIDDLEWARE
===================================== */

// JSON parser
app.use(express.json());

// CORS (Allow your frontend)
app.use(
  cors({
    origin: [
      "https://cryptodigitalpro.com",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    credentials: true,
  })
);

/* =====================================
   DATABASE CONNECTION
===================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

/* =====================================
   SOCKET.IO
===================================== */

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
  });
});

/* =====================================
   ROUTES
===================================== */

// Auth Routes (IMPORTANT)
app.use("/api/auth", require("./routes/auth"));

// Loan Routes
app.use("/api/loans", require("./routes/loans"));

// Admin Routes
app.use("/api/admin", require("./routes/admin"));

// Notifications (if separate)
app.use("/api/notifications", require("./routes/notifications"));

/* =====================================
   HEALTH CHECK
===================================== */

app.get("/", (req, res) => {
  res.json({ status: "API running 🚀" });
});

/* =====================================
   GLOBAL ERROR HANDLER
===================================== */

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* =====================================
   START SERVER
===================================== */

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
