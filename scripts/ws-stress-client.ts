#!/usr/bin/env node
import WebSocket from 'ws';

const C_DEFAULT = 10; // Default number of clients
const D_DEFAULT = 30; // Default duration in seconds
const I_DEFAULT = 100; // Default interval in milliseconds

const argv = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value !== undefined) {
    acc[key.replace(/^--/, '')] = value;
  }
  return acc;
}, {} as Record<string, string>);

const CONCURRENT_CLIENTS = parseInt(argv.clients || '', 10) || C_DEFAULT;
const DURATION_S = parseInt(argv.duration || argv.d || '', 10) || D_DEFAULT;
const SEND_INTERVAL_MS = parseInt(argv.interval || '', 10) || I_DEFAULT;
const URL = 'ws://127.0.0.1:3000/ws';

let messagesSent = 0;
let connections = 0;
let errors = 0;
const clients: WebSocket[] = [];

console.log(`🚀 Starting WebSocket Stress Test`);
console.log(`   - Target: ${URL}`);
console.log(`   - Concurrent Clients: ${CONCURRENT_CLIENTS}`);
console.log(`   - Test Duration: ${DURATION_S} seconds`);
console.log(`   - Message Interval: ${SEND_INTERVAL_MS} ms`);
console.log('------------------------------------------');

const createClient = (id: number) => {
  const ws = new WebSocket(URL);

  ws.on('open', () => {
    connections++;
    console.log(`[Client ${id}] Connection opened.`);

    const messageInterval = setInterval(() => {
      const message = {
        type: 'HRM_INPUT',
        data: {
          value: Math.floor(Math.random() * 40) + 120, // Simulate HR between 120 and 160
          name: `StressClient-${id}`,
          age: 30,
          maxHr: 190
        }
      };
      ws.send(JSON.stringify(message));
      messagesSent++;
    }, SEND_INTERVAL_MS);

    // Stop sending messages after the test duration
    setTimeout(() => {
      clearInterval(messageInterval);
      ws.close();
    }, DURATION_S * 1000);
  });

  ws.on('error', (error) => {
    errors++;
    console.error(`[Client ${id}] Error: ${error.message}`);
  });

  ws.on('close', () => {
    connections--;
    console.log(`[Client ${id}] Connection closed.`);
  });

  clients.push(ws);
};

// Create all clients
for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
  createClient(i);
}

const reportInterval = setInterval(() => {
    console.log(`[Report] Connections: ${connections} | Messages Sent: ${messagesSent} | Errors: ${errors}`);
}, 5000);


// Stop the test and print final report
setTimeout(() => {
  console.log('------------------------------------------');
  console.log(`🏁 Test Finished`);
  console.log(`   - Total Messages Sent: ${messagesSent}`);
  console.log(`   - Total Errors: ${errors}`);
  console.log('------------------------------------------');
  clearInterval(reportInterval);
  // The process should exit as all sockets are closed
}, (DURATION_S + 2) * 1000);
