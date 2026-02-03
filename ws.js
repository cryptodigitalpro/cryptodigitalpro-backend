import WebSocket from "ws";

let wss;
const clients = new Map();

/* ================= INIT ================= */
export function initWS(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    ws.userId = null;
    ws.isAdmin = false;

    clients.set(ws, ws);

    ws.on("message", msg => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === "identify") {
          ws.userId = data.userId ?? null;
          ws.isAdmin = !!data.isAdmin;
        }
      } catch {}
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  console.log("✅ WebSocket ready");
}

/* ================= NOTIFY USER ================= */
export function notifyUser(userId, payload) {
  for (const ws of clients.keys()) {
    if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

/* ================= NOTIFY ADMINS ================= */
export function notifyAdmins(payload) {
  for (const ws of clients.keys()) {
    if (ws.isAdmin && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

/* ================= BROADCAST ================= */
export function broadcast(payload) {
  if (!wss) return;
  const msg = JSON.stringify(payload);

  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}
