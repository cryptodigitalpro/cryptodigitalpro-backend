import WebSocket from "ws";

const clients = new Set();

/* ================= INIT ================= */
export function initWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  console.log("✅ WebSocket server initialized");
}

/* ================= BROADCAST ================= */
export function broadcast(data) {
  const message = JSON.stringify(data);

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
