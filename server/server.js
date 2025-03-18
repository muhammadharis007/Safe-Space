const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Update WebSocket server configuration
const wss = new WebSocket.Server({
  server,
  path: "/",
  clientTracking: true,
});

// Add error handling for WebSocket server
wss.on("error", function (error) {
  console.error("WebSocket Server Error:", error);
});

// Serve static files correctly
app.use(express.static(path.join(__dirname, "../public")));

// Update the catch-all route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

let connections = new Set();
let messageHistory = []; // Store message history
const MAX_HISTORY = 100; // Keep last 100 messages
let activeUsers = new Map(); // Track active users

wss.on("connection", (ws) => {
  let userInfo = null;

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

    // Handle initial user connection
    if (!userInfo && data.username) {
      userInfo = { username: data.username };
      activeUsers.set(ws, userInfo);

      // Broadcast join message
      const joinMsg = {
        type: "system",
        systemType: "join",
        username: data.username,
      };
      broadcast(joinMsg);
    }

    if (data.message) {
      // Regular chat message
      messageHistory.push(data);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift(); // Remove oldest message if limit reached
      }
      broadcast({ type: "message", data: data });
    }
  });

  ws.on("close", () => {
    if (userInfo) {
      // Broadcast leave message
      const leaveMsg = {
        type: "system",
        systemType: "leave",
        username: userInfo.username,
      };
      broadcast(leaveMsg);
      activeUsers.delete(ws);
    }
    connections.delete(ws);
  });

  connections.add(ws);
});

function broadcast(data) {
  connections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Update port configuration for Railway
const PORT = process.env.PORT || 3002;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

server.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
});
