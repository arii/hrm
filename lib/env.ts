// File: lib/env.ts
import { z } from 'zod'

// --- Environment Variable Schema ---
const envSchema = z.object({
  // -- Next.js --
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // -- Server --
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),

  // -- Authentication --
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').min(1),
  BASE_URL: z.string().url('BASE_URL must be a valid URL').min(1),

  // -- Spotify API --
  SPOTIFY_CLIENT_ID: z.string().min(1, 'SPOTIFY_CLIENT_ID is required'),
  SPOTIFY_CLIENT_SECRET: z
    .string()
    .min(1, 'SPOTIFY_CLIENT_SECRET is required'),
  SPOTIFY_CALLBACK_URL: z
    .string()
    .url('SPOTIFY_CALLBACK_URL must be a valid URL')
    .min(1),

  // -- Internal API --
  INTERNAL_TOKEN_DELIVERY_SECRET: z
    .string()
    .min(1, 'INTERNAL_TOKEN_DELIVERY_SECRET is required'),

  // -- Debugging --
  SPOTIFY_DEBUG: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true' || val === '1'),

  // -- CI/CD --
  CI: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true' || val === '1'),
})

// --- Conditionally Relax Schema for Testing ---
const finalSchema =
  process.env.TESTING === 'true' ? envSchema.partial() : envSchema

// --- Parse and Export Environment Variables ---
const parsedEnv = finalSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors
  )
  throw new Error('Invalid environment variables.')
}

export const env = parsedEnv.data
