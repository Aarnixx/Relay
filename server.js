const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

const WebSocket = require("ws");
const wss = new WebSocket.Server({ server }); // ← CORRECT: shares port with HTTP server

let host = null;
let clients = [];

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.role === "host") {
        host = ws;
        ws.send(JSON.stringify({ type: "ack", msg: "Host registered" }));
      } else if (data.role === "client") {
        clients.push(ws);
        ws.send(JSON.stringify({ type: "ack", msg: "Client registered" }));
        if (host) host.send(JSON.stringify({ type: "client_connected" }));
      } else if (data.type === "host_to_clients") {
        clients.forEach(c => c.readyState === 1 && c.send(JSON.stringify(data.payload)));
      } else if (data.type === "client_to_host") {
        if (host && host.readyState === 1)
          host.send(JSON.stringify(data.payload));
      }
    } catch (e) {
      console.error("Error handling message:", e.message);
    }
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
    if (ws === host) host = null;
  });
});

app.get("/", (_req, res) => res.send("Relay server is running."));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
