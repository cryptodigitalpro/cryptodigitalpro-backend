app.use((req,res,next)=>{
  console.log(new Date().toISOString(), req.method, req.url, req.ip);
  next();
});

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// ==========================
// TEST
// ==========================
app.get("/", (req, res) => {
  res.send("CryptoDigitalPro API running");
});

// ==========================
// USERS (admin)
 // ==========================
app.get("/api/users", async (req, res) => {
  try {
    const users = await pool.query(
      "SELECT id, full_name, email, balance, kyc_status, is_admin FROM users"
    );
    res.json(users.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// REGISTER
// ==========================
app.post("/api/register", async (req, res) => {
  const { full_name, email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    const user = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1,$2,$3) RETURNING id,full_name,email,balance",
      [full_name, email, hash]
    );

    res.json(user.rows[0]);
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// ==========================
// LOGIN
// ==========================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid login" });

  const token = jwt.sign(
    { id: user.id, is_admin: user.is_admin },
    process.env.JWT_SECRET
  );

  res.json({
    token,
    name: user.full_name,
    balance: user.balance,
    is_admin: user.is_admin
  });
});

// ==========================
// PROFILE
// ==========================
app.get("/api/me", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await pool.query(
      "SELECT id,full_name,email,balance,kyc_status,is_admin FROM users WHERE id=$1",
      [decoded.id]
    );

    res.json(user.rows[0]);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ==========================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

const { verifyToken, adminOnly } = require("./middleware/auth");

// Get all users
app.get("/api/admin/users", verifyToken, adminOnly, async (req, res) => {
  const users = await pool.query("SELECT id,email,balance,kyc_status,is_admin FROM users");
  res.json(users.rows);
});

// Add fake balance
app.post("/api/admin/deposit", verifyToken, adminOnly, async (req, res) => {
  const { user_id, amount } = req.body;
  await pool.query("UPDATE users SET balance = balance + $1 WHERE id=$2", [amount, user_id]);
  res.json({ success: true });
});

// Block user
app.post("/api/admin/block", verifyToken, adminOnly, async (req, res) => {
  const { user_id } = req.body;
  await pool.query("UPDATE users SET is_blocked = true WHERE id=$1", [user_id]);
  res.json({ success: true });
});

app.use((req,res,next)=>{
  console.log(req.method, req.url, req.ip);
  next();
});

app.post("/api/login", async (req,res)=>{
  ...
  console.log("LOGIN:", email, req.ip, new Date());
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
