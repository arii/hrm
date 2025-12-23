// File: tests/unit/lib/env.test.ts
import { env } from '../../../lib/env';

describe('Environment Variable Validation', () => {
  it('should have the correct NEXTAUTH_URL', () => {
    expect(env.NEXTAUTH_URL).toBe('http://127.0.0.1:3000');
  });

  it('should have a NEXTAUTH_SECRET', () => {
    expect(typeof env.NEXTAUTH_SECRET).toBe('string');
    expect(env.NEXTAUTH_SECRET.length).toBeGreaterThan(0);
  });

  it('should have a SPOTIFY_CLIENT_ID', () => {
    expect(typeof env.SPOTIFY_CLIENT_ID).toBe('string');
    expect(env.SPOTIFY_CLIENT_ID.length).toBeGreaterThan(0);
  });

  it('should have a SPOTIFY_CLIENT_SECRET', () => {
    expect(typeof env.SPOTIFY_CLIENT_SECRET).toBe('string');
    expect(env.SPOTIFY_CLIENT_SECRET.length).toBeGreaterThan(0);
  });
});
