import { exec } from 'child_process';
import { envSchema } from '../../lib/env';

describe('Server startup', () => {
  // Increase the timeout for this test to 30 seconds
  it('should fail to start with missing environment variables', (done) => {
    const requiredEnv = Object.keys(envSchema.shape);
    const missingEnv = requiredEnv.reduce((acc, key) => {
      // a few environment variables have default values, so we don't need to provide them
      if (key !== 'NODE_ENV' && key !== 'PORT' && key !== 'HOST') {
        acc[key] = '';
      }
      return acc;
    }, {} as Record<string, string>);

    const command = 'ts-node-esm server.ts';
    const child = exec(command, {
      env: {
        ...process.env,
        ...missingEnv,
        NODE_ENV: 'production',
      },
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data;
    });
    child.stderr?.on('data', (data) => {
      output += data;
    });

    child.on('exit', (code) => {
      expect(code).not.toBe(0);
      expect(output).toContain('! FATAL: Environment variable validation failed:');
      done();
    });
  }, 30000);
});
