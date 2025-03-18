let postCount = 0;
let username = "";
let ws;

// Replace window.onload with new modal implementation
window.onload = function () {
  showUsernameModal();
};

function showUsernameModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
        <div class="modal">
            <h2>Welcome to Safe Space</h2>
            <input type="text" id="username-input" 
                   placeholder="Enter your username" 
                   maxlength="20"
                   autocomplete="off">
            <button onclick="setUsername()">Join Chat</button>
        </div>
    `;
  document.body.appendChild(modal);

  const input = modal.querySelector("#username-input");
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") setUsername();
  });
  input.focus();
}

function setUsername() {
  const input = document.getElementById("username-input");
  username = input.value.trim() || "Anonymous";
  document.querySelector(".modal-overlay").remove();
  connectWebSocket();
}

function connectWebSocket() {
  // Simplified WebSocket URL logic
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  // Add connection error handling
  ws.onerror = function (err) {
    console.error("WebSocket error:", err);
  };

  ws.onopen = function () {
    console.log("WebSocket connected");
  };

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

// Update createMessage for better message formatting
function createMessage(user, text, count) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";

  // Sanitize input
  const sanitizedUser = user.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sanitizedText = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

  messageDiv.innerHTML = `
        <div class="header">
            <span class="name">${sanitizedUser}</span>
            <span class="timestamp">${formatTimestamp()}</span>
            <span class="number">No.${count}</span>
        </div>
        <div class="content">${sanitizedText}</div>
    `;
  return messageDiv;
}

function sendMessage() {
  const messageInput = document.getElementById("message");
  if (!messageInput.value) return;

  // Add connection check
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log("Reconnecting...");
    connectWebSocket();
    // Queue the message to be sent after connection
    setTimeout(() => sendMessage(), 1000);
    return;
  }

  ws.send(
    JSON.stringify({
      username: username,
      message: messageInput.value,
    })
  );

  messageInput.value = "";
}

document.getElementById("message").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
