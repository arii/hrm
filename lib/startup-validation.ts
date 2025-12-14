import { z } from 'zod';
import { env } from './env';

/**
 * =================================================================================
 * SERVER-SIDE ENVIRONMENT VARIABLES
 * =================================================================================
 */
const serverSchemaRaw = z.object({
  // --- Application & Server ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().optional(),

  // --- NextAuth ---
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is a required security variable.'),

  // --- Spotify ---
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().optional(),

  // --- Security ---
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 64-character hex key'),
  INTERNAL_TOKEN_DELIVERY_SECRET: z.string().min(1),

  // --- Database ---
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),

  // --- Features ---
  GOOGLE_DOC_WORKOUT_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // --- Build & Test ---
  TESTING: z.string().optional(),
  CI: z.string().optional(),
  ANALYZE: z.string().optional(),
  INCLUDE_MOBILE: z.string().optional(),
  TEST_BASE_URL: z.string().url().optional(),
  CHROME_PROFILE_PATH: z.string().optional(),
  SPOTIFY_EXPECTED_USER_ID: z.string().optional(),
});

// In a test environment, we don't want to require all secrets to be present.
const partialSchema = serverSchemaRaw.partial();

// Apply the transformation to the (potentially partial) schema.
const finalServerSchema = (process.env.NODE_ENV === 'test' ? partialSchema : serverSchemaRaw)
  .transform((data) => ({
    ...data,
    HOST: data.NODE_ENV === 'production' ? '0.0.0.0' : data.HOST || '127.0.0.1',
  }));

/**
 * =================================================================================
 * CLIENT-SIDE ENVIRONMENT VARIABLES
 * =================================================================================
 */
const clientSchema = z.object({
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_USE_NATIVE_TABLE: z.string().optional(),
});

/**
 * =================================================================================
 * DYNAMIC CLIENT-SIDE VARIABLE EXTRACTION
 * =================================================================================
 */
const clientEnv: { [key: string]: string | undefined } = {};
for (const key in process.env) {
  if (key.startsWith('NEXT_PUBLIC_')) {
    clientEnv[key] = process.env[key];
  }
}

/**
 * =================================================================================
 * STARTUP VALIDATION
 * =================================================================================
 */
export function validateEnvironment() {
    const _serverEnv = finalServerSchema.safeParse(process.env);
    const _clientEnv = clientSchema.safeParse(clientEnv);

    if (!_serverEnv.success) {
    console.error(
        '❌ Invalid server-side environment variables:',
        _serverEnv.error.flatten().fieldErrors,
    );
    throw new Error('Invalid server-side environment variables');
    }

    if (!_clientEnv.success) {
        console.error(
            '❌ Invalid client-side environment variables:',
            _clientEnv.error.flatten().fieldErrors,
        );
        throw new Error('Invalid client-side environment variables');
    }

    // Mutate the env object to add the validated variables
    Object.assign(env, _serverEnv.data, _clientEnv.data);
}
