// tests/unit/port-conflict.test.ts
import { createServer, Server } from 'http';
import { exec, ChildProcess } from 'child_process';
import kill from 'tree-kill';

describe('Port Conflict', () => {
  let blockingServer: Server | null = null;
  let serverProcess: ChildProcess | null = null;

  afterEach((done) => {
    let killed = false;
    if (serverProcess && serverProcess.pid) {
      kill(serverProcess.pid, 'SIGKILL', () => {
        if (!killed) {
          killed = true;
          done();
        }
      });
    }
    if (blockingServer) {
      blockingServer.close(() => {
        if (!killed) {
          killed = true;
          done();
        }
      });
    } else if (!serverProcess) {
      done();
    }
  });

  it('should exit with code 1 if the port is already in use', (done) => {
    const port = 3004;
    blockingServer = createServer((req, res) => {
      res.writeHead(200);
      res.end('hello world');
    });

    blockingServer.listen(port, () => {
      serverProcess = exec(`PORT=${port} node dist/server.mjs`);
      serverProcess.on('exit', (code) => {
        expect(code).toBe(1);
        done();
      });
    });
  }, 15000);
});
