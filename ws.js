import WebSocket from "ws";
import jwt from "jsonwebtoken";

const clients = new Map(); // userId -> ws

export function initWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    try {
      const token = new URL(req.url, "http://localhost").searchParams.get("token");
      if (!token) return ws.close();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      ws.userId = decoded.id;
      ws.isAdmin = decoded.role === "admin";

      clients.set(ws.userId, ws);

      ws.on("close", () => {
        clients.delete(ws.userId);
      });

    } catch (err) {
      ws.close();
    }
  });
}

/* ========= PUSH HELPERS ========= */

export function notifyUser(userId, payload) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function notifyAdmins(payload) {
  for (const ws of clients.values()) {
    if (ws.isAdmin && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}
