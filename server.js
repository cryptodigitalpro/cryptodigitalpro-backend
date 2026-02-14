require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */

app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

/* ================= ROUTES ================= */

app.use("/api/auth", require("./routes/auth"));

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.json({ status: "API running 🚀" });
});

/* ================= START SERVER ================= */

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
