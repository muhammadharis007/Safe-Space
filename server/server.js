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

function broadcast(data) {
  // Store all types of messages in history
  if (data.type === "message" || data.type === "system") {
    messageHistory.push(data);
    if (messageHistory.length > MAX_HISTORY) {
      messageHistory.shift();
    }
  }

  connections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  let userInfo = null;

  // Send message history to new connection
  if (messageHistory.length > 0) {
    ws.send(
      JSON.stringify({
        type: "history",
        messages: messageHistory, // Now includes both chat and system messages
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
      broadcast({
        type: "system",
        systemType: "join",
        username: data.username,
        timestamp: new Date().toISOString(), // Add timestamp for consistency
      });
    }

    if (data.message) {
      // Regular chat message
      broadcast({
        type: "message",
        data: {
          username: data.username,
          message: data.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  ws.on("close", () => {
    if (userInfo) {
      broadcast({
        type: "system",
        systemType: "leave",
        username: userInfo.username,
        timestamp: new Date().toISOString(),
      });
      activeUsers.delete(ws);
    }
    connections.delete(ws);
  });

  connections.add(ws);
});

// Update port configuration for Railway
const PORT = process.env.PORT || 3002;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

server.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
});
