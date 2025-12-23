import { envSchema } from '../../../lib/env';

describe('Environment variable validation', () => {
  it('should pass with valid environment variables', () => {
    const validEnv = {
      NODE_ENV: 'development',
      PORT: '3000',
      HOST: '127.0.0.1',
      NEXTAUTH_SECRET: 'secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      BASE_URL: 'http://localhost:3000',
      SPOTIFY_CLIENT_ID: 'client_id',
      SPOTIFY_CLIENT_SECRET: 'client_secret',
      SPOTIFY_CALLBACK_URL: 'http://localhost:3000/callback',
      INTERNAL_TOKEN_DELIVERY_SECRET: 'internal_secret',
      GOOGLE_DOC_WORKOUT_URL: 'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true',
    };
    expect(() => envSchema.parse(validEnv)).not.toThrow();
  });

  it('should fail with missing required environment variables', () => {
    const invalidEnv = {
      NODE_ENV: 'development',
      PORT: '3000',
      HOST: '127.0.0.1',
      NEXTAUTH_SECRET: 'secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      BASE_URL: 'http://localhost:3000',
      SPOTIFY_CLIENT_ID: 'client_id',
      // SPOTIFY_CLIENT_SECRET is missing
      SPOTIFY_CALLBACK_URL: 'http://localhost:3000/callback',
      INTERNAL_TOKEN_DELIVERY_SECRET: 'internal_secret',
      GOOGLE_DOC_WORKOUT_URL: 'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true',
    };
    expect(() => envSchema.parse(invalidEnv)).toThrow();
  });

  it('should fail with malformed environment variables', () => {
    const invalidEnv = {
      NODE_ENV: 'development',
      PORT: '3000',
      HOST: '127.0.0.1',
      NEXTAUTH_SECRET: 'secret',
      NEXTAUTH_URL: 'not_a_url', // malformed URL
      BASE_URL: 'http://localhost:3000',
      SPOTIFY_CLIENT_ID: 'client_id',
      SPOTIFY_CLIENT_SECRET: 'client_secret',
      SPOTIFY_CALLBACK_URL: 'http://localhost:3000/callback',
      INTERNAL_TOKEN_DELIVERY_SECRET: 'internal_secret',
      GOOGLE_DOC_WORKOUT_URL: 'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true',
    };
    expect(() => envSchema.parse(invalidEnv)).toThrow();
  });
});
