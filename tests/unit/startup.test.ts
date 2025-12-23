// File: tests/unit/startup.test.ts
import { ZodError } from 'zod';

// Mock dotenv to prevent it from loading .env.local during tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Environment Variable Validation on Startup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clear the module cache
    process.env = { ...originalEnv }; // Restore original env
  });

  afterAll(() => {
    process.env = originalEnv; // Final cleanup
  });

  it('should throw a ZodError if NEXTAUTH_URL is missing', () => {
    delete process.env.NEXTAUTH_URL;
    // The error is thrown when the module is imported and parsed
    expect(() => {
      require('../../lib/env');
    }).toThrow(ZodError);
  });

  it('should throw a ZodError if SPOTIFY_CLIENT_ID is missing', () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    expect(() => {
      require('../../lib/env');
    }).toThrow(ZodError);
  });

  it('should not throw an error if all required variables are present', () => {
    // Explicitly set all required env vars for the happy path test
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';

    expect(() => {
      require('../../lib/env');
    }).not.toThrow();
  });
});
