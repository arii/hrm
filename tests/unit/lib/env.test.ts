
describe('Environment Variable Validation', () => {
  const originalProcessEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    process.env = originalProcessEnv;
  });

  describe('Build-time Validation', () => {
    it('should allow server-side variables to be optional during build', () => {
      process.env.npm_lifecycle_event = 'build';
      // Missing server-side variables
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;

      const { env: buildEnv } = require('../../../lib/env');
      expect(buildEnv.SPOTIFY_CLIENT_ID).toBeUndefined();
    });
  });

  describe('Runtime Validation', () => {
    it('should fail if required server-side variables are missing at runtime', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit() was called.');
      });
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate runtime by not setting the build-time flag
      process.env.npm_lifecycle_event = '';
      delete process.env.SPOTIFY_CLIENT_ID;

      try {
        require('../../../lib/env');
      } catch (e) {
        expect((e as Error).message).toBe('process.exit() was called.');
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalled();

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should pass if all required variables are present', () => {
      process.env.SPOTIFY_CLIENT_ID = 'test-id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test-secret';
      process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3000';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { validateServerRuntimeEnv } = require('../../../lib/env');
      expect(() => validateServerRuntimeEnv()).not.toThrow();
    });
  });

  describe('Test Environment', () => {
    it('should allow server-side variables to be optional when TESTING is true', () => {
      process.env.TESTING = 'true';
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;

      const { env: testEnv } = require('../../../lib/env');
      expect(testEnv.SPOTIFY_CLIENT_ID).toBeUndefined();
    });
  });
});
