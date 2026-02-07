import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import { initWS } from "./ws.js";

/* ROUTES */
import adminRoutes from "./routes/admin.js";
import loanRoutes from "./routes/loans.js";
import chatRoutes from "./routes/chat.js";
import txRoutes from "./routes/transactions.js";
import kycRoutes from "./routes/kyc.js";

dotenv.config();

/* ================= APP ================= */
const app = express();

app.use(cors({
  origin: "*", // tighten later with Netlify domain
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= ENV CHECK ================= */
console.log("ENV CHECK", {
  DATABASE_URL: !!process.env.DATABASE_URL,
  JWT_SECRET: !!process.env.JWT_SECRET,
});

/* ================= ROUTES ================= */
app.use("/api/admin", adminRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/transactions", txRoutes);
app.use("/api/kyc", kycRoutes);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 10000;
const server = http.createServer(app);

/* 🔔 INIT WEBSOCKET */
initWS(server);

server.listen(PORT, () => {
  console.log(`🚀 API + WebSocket running on port ${PORT}`);
});
