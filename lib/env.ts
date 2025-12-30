import { z } from 'zod'

const isBuild = process.env.npm_lifecycle_event === 'build'
const isTest = process.env.TESTING === 'true'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  TESTING: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),

  // Public variables that should be available at build time
  NEXT_PUBLIC_WS_URL: z.string().url(),

  // Server-side variables
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1),

  // Server-side variables that can be optional during build or test
  SPOTIFY_CLIENT_ID:
    isBuild || isTest ? z.string().min(1).optional() : z.string().min(1),
  SPOTIFY_CLIENT_SECRET:
    isBuild || isTest ? z.string().min(1).optional() : z.string().min(1),

  SPOTIFY_DEBUG: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.string().default('3000').transform(Number),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z
    .string()
    .default('10000')
    .transform(Number),
  WEBSOCKET_GRACE_PERIOD_MS: z.string().default('5000').transform(Number),
  MAX_WS_CLIENTS: z.string().default('1000').transform(Number),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(parsedEnv.error.format(), null, 2)
  )
  process.exit(1)
}

export const env = parsedEnv.data

/**
 * A stricter validation function for server runtime.
 * This ensures that variables that were optional during build are present at runtime.
 */
export function validateServerRuntimeEnv() {
  const runtimeSchema = z.object({
    SPOTIFY_CLIENT_ID: z.string().min(1),
    SPOTIFY_CLIENT_SECRET: z.string().min(1),
  })

  const runtimeParsed = runtimeSchema.safeParse(env)

  if (!runtimeParsed.success) {
    console.error(
      '❌ Missing or invalid server runtime environment variables:',
      JSON.stringify(runtimeParsed.error.format(), null, 2)
    )
    process.exit(1)
  }
}
