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
 *
 * During the build process (`next build`), certain server-side environment
 * variables may not be available. To prevent build failures, we make these
 * variables optional if the `CI` environment variable is set to `'true'`, if
 * the npm lifecycle event is 'build', or if `TESTING` is true. The runtime
 * validation in `server.ts` will still enforce their presence in production.
 */
const isBuildOrTest =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.CI === 'true' ||
  process.env.TESTING === 'true'

const envSchema = z.object({
  // --- NextAuth ---
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: isBuildOrTest ? z.string().optional() : z.string().min(1),

  // --- Spotify ---
  SPOTIFY_CLIENT_ID: isBuildOrTest ? z.string().optional() : z.string().min(1),
  SPOTIFY_CLIENT_SECRET: isBuildOrTest
    ? z.string().optional()
    : z.string().min(1),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),

  // --- Application ---
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  HOST: z.string().optional().default('127.0.0.1'),
  PORT: z.coerce.number().default(3000),

  // --- Security & Persistence ---
  ENCRYPTION_KEY: isBuildOrTest
    ? z.string().optional()
    : z
        .string()
        .length(
          64,
          'ENCRYPTION_KEY must be 64 characters long (a 32-byte hex string)'
        )
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
 */
export const env = envSchema.parse(process.env)

/**
 * A separate runtime validation function to be called explicitly in `server.ts`.
 * This ensures that server-specific, required environment variables are present
 * when the application starts in a production environment, even if they were
 * optional during the build phase.
 */
export function validateRuntimeEnv() {
  const runtimeSchema = z.object({
    NEXTAUTH_SECRET: z.string().min(1),
    SPOTIFY_CLIENT_ID: z.string().min(1),
    SPOTIFY_CLIENT_SECRET: z.string().min(1),
    // ENCRYPTION_KEY is required for token persistence
    ENCRYPTION_KEY: env.SPOTIFY_TOKEN_PERSISTENCE
      ? z
          .string()
          .length(
            64,
            'ENCRYPTION_KEY must be 64 characters long (a 32-byte hex string)'
          )
      : z.string().optional(),
  })

  try {
    runtimeSchema.parse(process.env)
  } catch (error) {
    console.error(
      '🔴 Critical runtime environment variables are missing or invalid:',
      error
    )
    process.exit(1)
  }
}
