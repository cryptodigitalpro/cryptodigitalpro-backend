import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/* ================= DATABASE ================= */
await pool.query(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  full_name TEXT,
  balance NUMERIC DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  locked BOOLEAN DEFAULT false,
  insurance NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
`);

/* ================= HELPERS ================= */
function createToken(user){
  return jwt.sign({ id:user.id, isAdmin:user.is_admin }, JWT_SECRET, { expiresIn:"7d" });
}

function auth(req,res,next){
  try{
    const token = req.headers.authorization.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  }catch{
    res.status(401).json({ error:"Unauthorized" });
  }
}

function admin(req,res,next){
  if(!req.user.isAdmin) return res.status(403).json({error:"Admin only"});
  next();
}

/* ================= AUTH ================= */
app.post("/api/register", async (req,res)=>{
  const { email, password, fullName } = req.body;
  const hash = await bcrypt.hash(password,10);

  try{
    const q = await pool.query(
      "INSERT INTO users(email,password,full_name) VALUES($1,$2,$3) RETURNING *",
      [email,hash,fullName]
    );
    res.json({ token:createToken(q.rows[0]) });
  }catch{
    res.status(400).json({ error:"User exists" });
  }
});

app.post("/api/login", async (req,res)=>{
  const { email,password } = req.body;
  const q = await pool.query("SELECT * FROM users WHERE email=$1",[email]);
  if(!q.rows.length) return res.status(400).json({error:"Invalid"});

  const ok = await bcrypt.compare(password,q.rows[0].password);
  if(!ok) return res.status(400).json({error:"Invalid"});

  res.json({ token:createToken(q.rows[0]) });
});

/* ================= USER ================= */
app.get("/api/me", auth, async(req,res)=>{
  const q = await pool.query("SELECT id,email,full_name,balance FROM users WHERE id=$1",[req.user.id]);
  res.json(q.rows[0]);
});

/* ================= LOANS ================= */
app.post("/api/loan", auth, async(req,res)=>{
  const { amount } = req.body;
  await pool.query(
    "INSERT INTO loans(user_id,amount) VALUES($1,$2)",
    [req.user.id,amount]
  );
  res.json({ success:true });
});

app.get("/api/myloans", auth, async(req,res)=>{
  const q = await pool.query("SELECT * FROM loans WHERE user_id=$1",[req.user.id]);
  res.json(q.rows);
});

/* ================= ADMIN ================= */
app.get("/api/admin/users", auth, admin, async(req,res)=>{
  const q = await pool.query("SELECT id,email,full_name,balance FROM users");
  res.json(q.rows);
});

app.get("/api/admin/loans", auth, admin, async(req,res)=>{
  const q = await pool.query(`
    SELECT loans.*, users.email, users.full_name
    FROM loans JOIN users ON loans.user_id = users.id
  `);
  res.json(q.rows);
});

app.post("/api/admin/approve/:id", auth, admin, async(req,res)=>{
  await pool.query("UPDATE loans SET status='approved' WHERE id=$1",[req.params.id]);
  res.json({success:true});
});

app.post("/api/admin/lock/:id", auth, admin, async(req,res)=>{
  const { insurance, tax } = req.body;
  await pool.query(
    "UPDATE loans SET locked=true, insurance=$1, tax=$2 WHERE id=$3",
    [insurance,tax,req.params.id]
  );
  res.json({success:true});
});

app.post("/api/admin/deposit/:userId", auth, admin, async(req,res)=>{
  const { amount } = req.body;
  await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id=$2",
    [amount,req.params.userId]
  );
  res.json({success:true});
});

/* ================= START ================= */
app.listen(3000, ()=>console.log("Server running"));

// ================= LOANS =================

// Apply for loan (USER)
app.post("/api/apply-loan", auth, async (req,res)=>{
  const { amount, duration, loan_type } = req.body;

  if(!amount || !duration || !loan_type)
    return res.status(400).json({ error:"Missing fields" });

  const loan = await db.one(
    `INSERT INTO loans (user_id, amount, duration, loan_type, status)
     VALUES ($1,$2,$3,$4,'pending')
     RETURNING *`,
    [req.user.id, amount, duration, loan_type]
  );

  res.json(loan);
});

// Get my loans (USER)
app.get("/api/my-loans", auth, async (req,res)=>{
  const loans = await db.any(
    "SELECT * FROM loans WHERE user_id=$1 ORDER BY id DESC",
    [req.user.id]
  );
  res.json(loans);
});

// Get all loans (ADMIN)
app.get("/api/admin/loans", authAdmin, async (req,res)=>{
  const loans = await db.any(`
    SELECT loans.*, users.full_name, users.email
    FROM loans
    JOIN users ON users.id = loans.user_id
    ORDER BY loans.id DESC
  `);
  res.json(loans);
});

// Approve / Reject loan (ADMIN)
app.post("/api/admin/loan-status", authAdmin, async (req,res)=>{
  const { loan_id, status } = req.body;

  if(!["approved","rejected"].includes(status))
    return res.status(400).json({ error:"Invalid status" });

  const loan = await db.one(
    "UPDATE loans SET status=$1 WHERE id=$2 RETURNING *",
    [status, loan_id]
  );

  // If approved → credit balance
  if(status==="approved"){
    await db.none(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [loan.amount, loan.user_id]
    );
  }

  res.json(loan);
});

