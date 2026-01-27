import WebSocket from "ws";

const clients = new Map();

/* ================= INIT ================= */
export function initWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    // TEMP user identification (can be improved later)
    ws.userId = null;
    ws.isAdmin = false;

    clients.set(ws, ws);

    ws.on("message", msg => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === "identify") {
          ws.userId = data.userId;
          ws.isAdmin = !!data.isAdmin;
        }
      } catch (e) {}
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  console.log("✅ WebSocket server ready");
}

/* ================= USER NOTIFY ================= */
export function notifyUser(userId, payload) {
  for (const ws of clients.keys()) {
    if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

/* ================= ADMIN NOTIFY ================= */
export function notifyAdmins(payload) {
  for (const ws of clients.keys()) {
    if (ws.isAdmin && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

/* ================= BROADCAST ================= */
export function broadcast(payload) {
  for (const ws of clients.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}
