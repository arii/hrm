
import { envSchema } from '../../../lib/env';


describe('envSchema', () => {
  it('should validate a correct environment', () => {
    const correctEnv = {
      NODE_ENV: 'development',
      PORT: '3000',
      HOST: '127.0.0.1',
      NEXTAUTH_SECRET: 'secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      BASE_URL: 'http://localhost:3000',
      SPOTIFY_CLIENT_ID: 'spotify-client-id',
      SPOTIFY_CLIENT_SECRET: 'spotify-client-secret',
      SPOTIFY_CALLBACK_URL: 'http://localhost:3000/callback',
      INTERNAL_TOKEN_DELIVERY_SECRET: 'internal-secret',
      SPOTIFY_DEBUG: 'true',
      CI: 'true',
      GOOGLE_DOC_WORKOUT_URL: 'https://docs.google.com/document/d/123/edit',
      NEXT_PUBLIC_USE_NATIVE_TABLE: 'true',
      TESTING: 'true',
    };
    expect(() => envSchema.parse(correctEnv)).not.toThrow();
  });

  it('should throw an error if NEXTAUTH_SECRET is missing', () => {
    const incorrectEnv = {
      // NEXTAUTH_SECRET is missing
    };
    expect(() => envSchema.parse(incorrectEnv)).toThrow();
  });

  it('should throw an error if NEXTAUTH_URL is not a valid URL', () => {
    const incorrectEnv = {
      NEXTAUTH_URL: 'not-a-url',
    };
    expect(() => envSchema.parse(incorrectEnv)).toThrow();
  });
});
