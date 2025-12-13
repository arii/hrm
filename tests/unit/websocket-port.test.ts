// tests/unit/websocket-port.test.ts
import WebSocket from 'ws';
import { exec, ChildProcess } from 'child_process';
import kill from 'tree-kill';

describe('WebSocket Port Configuration', () => {
  let serverProcess: ChildProcess | null = null;

  afterEach((done) => {
    if (serverProcess && serverProcess.pid) {
      kill(serverProcess.pid, 'SIGKILL', (_err) => {
        serverProcess = null;
        done();
      });
    } else {
      done();
    }
  });

  it('should start the WebSocket server on a custom port', (done) => {
    const wsPort = 3003;
    serverProcess = exec(`WS_PORT=${wsPort} node dist/server.mjs`);

    const checkServer = () => {
      const ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);
      ws.on('open', () => {
        ws.close();
        done();
      });
      ws.on('error', () => {
        setTimeout(checkServer, 1000);
      });
    };

    checkServer();
  }, 15000);
});
