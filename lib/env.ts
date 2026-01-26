// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // General
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1),

  // Spotify
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_POLLING_INTERVAL_MS: z
    .string()
    .transform(Number)
    .refine((n) => n >= 1000, 'Must be at least 1000ms')
    .default('5000'),

  // Redis (Optional)
  REDIS_URL: z.string().url().optional(),

  // Google Docs
  NEXT_PUBLIC_WORKOUT_URL: z.string().url().optional(),

  // WebSocket
  WS_PORT: z
    .string()
    .transform(Number)
    .refine((p) => p > 0 && p < 65536, 'Invalid port')
    .default('3001'),
  CLIENT_SESSION_TIMEOUT_MS: z
    .string()
    .transform(Number)
    .refine((n) => n > 5000, 'Must be greater than 5000ms')
    .default('60000'), // 1 minute
})

// Use a function to safely parse and export environment variables
const getEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error(
      '🔥 Invalid environment variables:',
      result.error.flatten().fieldErrors
    )
    // Exit if validation fails, except in test environment for setup purposes
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1)
    }
  }

  return result.success ? result.data : ({} as z.infer<typeof envSchema>)
}

const env = getEnv()

export const {
  NODE_ENV,
  LOG_LEVEL,
  NEXTAUTH_URL,
  NEXTAUTH_SECRET,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_POLLING_INTERVAL_MS,
  REDIS_URL,
  NEXT_PUBLIC_WORKOUT_URL,
  WS_PORT,
  CLIENT_SESSION_TIMEOUT_MS,
} = env
