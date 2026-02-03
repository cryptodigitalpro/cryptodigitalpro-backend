import express from "express";
import cors from "cors";
import http from "http";
import pkg from "pg";
import { initWS } from "./ws.js";

import adminRoutes from "./routes/admin.js";
import loanRoutes from "./routes/loans.js";
import chatRoutes from "./routes/chat.js";
import txRoutes from "./routes/transactions.js";

const { Pool } = pkg;

/* ================= APP ================= */
const app = express();
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ================= ROUTES ================= */
app.use("/api/admin", adminRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/transactions", txRoutes);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

/* 🔔 INIT WEBSOCKET */
initWS(server);

server.listen(PORT, () => {
  console.log(`🚀 API + WebSocket running on ${PORT}`);
});
