import { spawn } from 'child_process';
import { createServer } from 'http';

describe('Backend Port Conflict', () => {
  it('should exit with an error when the port is already in use', (done) => {
    const port = 5555;
    const server = createServer().listen(port);

    server.on('listening', () => {
      const child = spawn('node', ['--loader', 'ts-node/esm', 'server.ts'], {
        env: { ...process.env, PORT: port.toString() },
      });

      child.on('exit', (code) => {
        expect(code).not.toBe(0);
        server.close();
        done();
      });
    });
  });
});
