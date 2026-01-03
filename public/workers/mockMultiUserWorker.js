
const clients = [];
let intervalId;

function connectClient(userId, name, age) {
  const ws = new WebSocket(`ws://${self.location.host}`);

  ws.onopen = () => {
    console.log(`Mock client ${userId} connected`);
    // Identify the client to the server
    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      data: {
        userId: userId,
        // The server expects an encrypted refresh token, but for mocking, a simple string is fine
        encryptedRefreshToken: 'mock-token',
      },
    }));
    // Send initial metadata
    ws.send(JSON.stringify({
      type: 'HRM_METADATA_UPDATE',
      data: { name, age, maxHr: 220 - age },
    }));
  };

  ws.onclose = () => {
    console.log(`Mock client ${userId} disconnected`);
  };

  ws.onerror = (error) => {
    console.error(`Mock client ${userId} error:`, error);
  };

  return { ws, userId, name, age, hr: 100 };
}

function startStreaming() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    clients.forEach(client => {
      // Fluctuate HR
      client.hr = Math.max(70, client.hr + Math.floor(Math.random() * 5) - 2);
      const message = {
        type: 'HRM_INPUT',
        data: { value: client.hr },
      };
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }, 2000);
}

function stopStreaming() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  clients.forEach(client => {
    client.ws.close();
  });
  clients.length = 0; // Clear the array
}

self.onmessage = (event) => {
  const { command, count } = event.data;

  if (command === 'start') {
    stopStreaming(); // Stop any existing simulation
    for (let i = 0; i < count; i++) {
      const userId = `mock-user-${i}`;
      const name = `Mock ${i + 1}`;
      const age = 25 + i;
      clients.push(connectClient(userId, name, age));
    }
    startStreaming();
  } else if (command === 'stop') {
    stopStreaming();
  }
};
