require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= DB CONNECT =================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ Mongo Error:", err));

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("✅ Backend Working");
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on " + PORT);
});

app.get("/", (req, res) => {
  res.send("API is working ✅");
});

app.get("/api", (req, res) => {
  res.json({ message: "API is working ✅" });
});