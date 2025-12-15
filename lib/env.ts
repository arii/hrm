/**
 * @file Environment variable validation and type-safe access.
 * @module lib/env
 * @description This module centralizes environment variable validation using Zod,
 * ensuring that all required variables are present and correctly typed at application startup.
 * It provides a single, type-safe `env` object for use throughout the application.
 */

import { z } from 'zod'

/**
 * Zod schema for environment variables.
 * Specifies the expected type and validation rules for each variable.
 */
const envSchema = z.object({
  // --- Server Core ---
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  // --- NextAuth & Security ---
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z
    .string()
    .min(1, 'NEXTAUTH_SECRET is required for authentication'),
  INTERNAL_TOKEN_DELIVERY_SECRET: z
    .string()
    .min(1, 'INTERNAL_TOKEN_DELIVERY_SECRET is required'),

  // --- Spotify Integration ---
  SPOTIFY_CLIENT_ID: z.string().min(1, 'SPOTIFY_CLIENT_ID is required'),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, 'SPOTIFY_CLIENT_SECRET is required'),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  SPOTIFY_DEBUG: z.string().optional(),
  SPOTIFY_EXPECTED_USER_ID: z.string().optional(),

  // --- External Services ---
  GOOGLE_DOC_WORKOUT_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),

  // --- Build & Test Environment ---
  TESTING: z.string().optional(),
  CI: z.string().optional(),
  ANALYZE: z.string().optional(),
  npm_package_version: z.string().optional(),

  // --- Next.js Public Variables (client-side access) ---
  NEXT_PUBLIC_WS_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_API_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_USE_NATIVE_TABLE: z.string().optional(),
})

/**
 * Validated and typed environment variables.
 *
 * This object is the result of parsing `process.env` with the `envSchema`.
 * If any required environment variables are missing or invalid,
 * the application will throw an error at startup.
 *
 * @example
 * import { env } from '@/lib/env';
 * const port = env.PORT;
 */
export const env = envSchema.parse(process.env)
