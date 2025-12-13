// tests/integration/server.test.ts
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

jest.setTimeout(45000);

describe('Server Port Conflict Handling', () => {
  let blockingServer: ChildProcess;
  const PORT = 3006;
  const healthCheckUrl = `http://127.0.0.1:${PORT}/api/health`;

  afterEach((done) => {
    if (blockingServer && blockingServer.pid) {
      try {
        process.kill(-blockingServer.pid, 'SIGKILL');
      } catch (e) {
        // Ignore
      }
    }
    setTimeout(done, 500);
  });

  it('should exit with a non-zero code if the port is already in use', (done) => {
    const testEnv = {
      ...process.env,
      PORT: `${PORT}`,
      NODE_ENV: 'production',
      NEXTAUTH_SECRET: 'test-secret-for-port-conflict-test',
      TESTING: 'true',
    };

    blockingServer = spawn('node', ['dist/server.mjs'], {
      env: testEnv,
      detached: true,
    });

    blockingServer.on('error', (err) => {
      done(err);
    });

    const checkServerReady = () => {
      const req = http.get(healthCheckUrl, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          clearTimeout(timeout);
          startConflictingServer();
        }
      });
      req.on('error', () => { /* Ignore */ });
    };

    const interval = setInterval(checkServerReady, 500);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      done(new Error('Blocking server failed to start in time.'));
    }, 30000);

    const startConflictingServer = () => {
      const conflictingServer = spawn('node', ['dist/server.mjs'], {
        env: testEnv,
      });

      conflictingServer.on('exit', (code) => {
        expect(code).not.toBe(0);
        expect(code).toBe(1);
        done();
      });

      conflictingServer.on('error', (err) => {
        done(err);
      });
    };
  });
});
