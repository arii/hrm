import { spawn } from 'child_process';
import { createServer } from 'http';

describe('WebSocket Port Conflict', () => {
  it('should exit with an error when the port is already in use', (done) => {
    const port = 5556;
    const server = createServer().listen(port);

    server.on('listening', () => {
      const child = spawn('node', ['--loader', 'ts-node/esm', 'tests/ports/websocket-runner.ts'], {
        env: { ...process.env, WS_PORT: port.toString() },
      });

      child.on('exit', (code) => {
        expect(code).not.toBe(0);
        server.close();
        done();
      });
    });
  });
});
