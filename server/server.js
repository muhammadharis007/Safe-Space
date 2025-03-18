const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files correctly
app.use(express.static(path.join(__dirname, "../public")));

// Update the catch-all route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

let connections = new Set();
let messageHistory = []; // Store message history
const MAX_HISTORY = 100; // Keep last 100 messages

wss.on("connection", (ws) => {
  connections.add(ws);

  // Send message history to new connection
  if (messageHistory.length > 0) {
    ws.send(
      JSON.stringify({
        type: "history",
        messages: messageHistory,
      })
    );
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Store message in history
    messageHistory.push(data);
    if (messageHistory.length > MAX_HISTORY) {
      messageHistory.shift(); // Remove oldest message if limit reached
    }

    // Broadcast to all clients
    connections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "message",
            data: data,
          })
        );
      }
    });
  });

  ws.on("close", () => {
    connections.delete(ws);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
