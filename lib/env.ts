import { z } from 'zod';
import logger from '../utils/logger.js';

// Exporting schema for testing purposes
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('127.0.0.1'),
  NEXTAUTH_SECRET: z.string().min(1, { message: 'NEXTAUTH_SECRET is required.' }),
  NEXTAUTH_URL: z.string().url({ message: 'NEXTAUTH_URL must be a valid URL.' }),
  BASE_URL: z.string().url({ message: 'BASE_URL must be a valid URL.' }),
  SPOTIFY_CLIENT_ID: z.string().min(1, { message: 'SPOTIFY_CLIENT_ID is required.' }),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, { message: 'SPOTIFY_CLIENT_SECRET is required.' }),
  SPOTIFY_CALLBACK_URL: z.string().url({ message: 'SPOTIFY_CALLBACK_URL must be a valid URL.' }),
  INTERNAL_TOKEN_DELIVERY_SECRET: z.string().min(1, { message: 'INTERNAL_TOKEN_DELIVERY_SECRET is required.' }),
  SPOTIFY_DEBUG: z.string().optional(),
  CI: z.string().optional(),
  GOOGLE_DOC_WORKOUT_URL: z.string().url({ message: 'GOOGLE_DOC_WORKOUT_URL must be a valid URL.' }),
  NEXT_PUBLIC_USE_NATIVE_TABLE: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  TESTING: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function createTestEnv(): Env {
  return {
    NODE_ENV: 'test',
    PORT: 3001, // use a different port for tests
    HOST: '127.0.0.1',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:3001',
    BASE_URL: 'http://localhost:3001',
    SPOTIFY_CLIENT_ID: 'test-id',
    SPOTIFY_CLIENT_SECRET: 'test-secret',
    SPOTIFY_CALLBACK_URL: 'http://localhost:3001/callback',
    INTERNAL_TOKEN_DELIVERY_SECRET: 'test-internal-secret',
    GOOGLE_DOC_WORKOUT_URL: 'https://google.com/doc',
    TESTING: 'true',
  };
}

export function parseEnv(env: NodeJS.ProcessEnv): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('! FATAL: Environment variable validation failed:');
      error.issues.forEach((issue) => {
        logger.error(`- ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Invalid environment variables');
    }
    logger.error('An unexpected error occurred during env validation.', error);
    throw error;
  }
}

// If running in test env, export a mock env object.
// Otherwise, parse and validate the actual process.env.
const env: Env = process.env.NODE_ENV === 'test' ? createTestEnv() : parseEnv(process.env);

export { env };
