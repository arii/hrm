// File: lib/env.ts (Environment Variable Validation)
/**
 * Description: Centralized environment variable validation using Zod.
 * This module ensures that all required environment variables are present
 * and correctly typed at application startup. It provides a single,
 * type-safe object `env` to be used throughout the application,
 * replacing direct access to `process.env`.
 */

import { z } from 'zod'

/**
 * Zod schema for environment variables.
 * Defines the required and optional variables for the application.
 */
const envSchema = z.object({
  // --- NextAuth ---
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1),

  // --- Spotify ---
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),

  // --- Application ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().optional().default('127.0.0.1'),
  PORT: z.coerce.number().default(3000),

  // --- Security & Persistence ---
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be 64 characters long (a 32-byte hex string)')
    .optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().default(3000),
  SPOTIFY_TOKEN_PERSISTENCE: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  // --- Debugging & Testing ---
  TESTING: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  SPOTIFY_DEBUG: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  // --- AI Services ---
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional().default('gemini-1.5-flash'),
})

/**
 * Parsed and validated environment variables.
 *
 * This object is the single source of truth for environment variables
 * throughout the application. Accessing variables through this object
 * ensures they are type-safe and have been validated against the schema.
 *
 * If validation fails (e.g., a required variable is missing), the server
 * will throw an error and refuse to start, preventing runtime errors
 * due to misconfiguration.
 *
 * @example
 * import { env } from '@/lib/env';
 *
 * const clientId = env.SPOTIFY_CLIENT_ID;
 * if (env.NODE_ENV === 'development') {
 *   // ...
 * }
 */
export const env = envSchema.parse(process.env)
