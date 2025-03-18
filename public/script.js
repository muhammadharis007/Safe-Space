let postCount = 0;
let username = "";
let ws;

// Get username when page loads
window.onload = function () {
  username = prompt("Please enter your username:") || "Anonymous";
  connectWebSocket();
};

function connectWebSocket() {
  // Make WebSocket URL dynamic for both local and production
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl =
    process.env.NODE_ENV === "production"
      ? `${protocol}//${window.location.host}`
      : `${protocol}//${window.location.hostname}:3002`;

  ws = new WebSocket(wsUrl);

  ws.onmessage = function (event) {
    const data = JSON.parse(event.data);
    const messagesDiv = document.getElementById("messages");

    if (data.type === "history") {
      // Clear existing dummy messages
      messagesDiv.innerHTML = "";
      // Add historical messages
      data.messages.forEach((msg) => {
        postCount++;
        messagesDiv.appendChild(
          createMessage(msg.username, msg.message, postCount)
        );
      });
    } else if (data.type === "message") {
      postCount++;
      messagesDiv.appendChild(
        createMessage(data.data.username, data.data.message, postCount)
      );
    }

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  ws.onclose = function () {
    // Try to reconnect in 5 seconds
    setTimeout(connectWebSocket, 5000);
  };
}

function formatTimestamp() {
  const date = new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createMessage(user, text, count) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.innerHTML = `
        <div class="header">
            <span class="name">${user}</span>
            <span class="timestamp">${formatTimestamp()}</span>
            <span class="number">No.${count}</span>
        </div>
        <div class="content">${text}</div>
    `;
  return messageDiv;
}

function sendMessage() {
  const messageInput = document.getElementById("message");
  if (!messageInput.value) return;

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        username: username,
        message: messageInput.value,
      })
    );
  }

  messageInput.value = "";
}

document.getElementById("message").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
