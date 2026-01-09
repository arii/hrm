import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  BASE_URL: z.string().url().optional(),
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),
  INTERNAL_TOKEN_DELIVERY_SECRET: z.string().optional(),
  SPOTIFY_DEBUG: z.string().optional(),
  CI: z.string().optional(),
  GOOGLE_DOC_WORKOUT_URL: z.string().url().optional(),
  NEXT_PUBLIC_USE_NATIVE_TABLE: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_WS_URL: z.string().url().optional().or(z.literal('')),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  SPOTIFY_API_MAX_REQUESTS: z.coerce.number().default(30),
  INTERNAL_API_MAX_REQUESTS: z.coerce.number().default(100),
  GENERAL_API_MAX_REQUESTS: z.coerce.number().default(200),
  // The default of 1000 provides a generous limit for concurrent WebSocket connections,
  // suitable for a moderate-scale deployment. This can be adjusted based on expected user load.
  WS_MAX_CONNECTIONS: z.coerce.number().default(1000),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().default(5000),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.coerce.number().default(10000),
  WEBSOCKET_PING_TIMEOUT: z.coerce.number().int().positive().default(15000),
  WEBSOCKET_GRACE_PERIOD_MS: z.coerce.number().default(5000),
  WEBSOCKET_WATCHDOG_INTERVAL: z.coerce.number().optional(),
  GEMINI_MODEL_FALLBACKS: z.string().optional(),
  ANALYZE: z.string().optional(),
  TESTING: z.string().optional(),
  IS_DEPLOYMENT: z.string().optional(),
  WS_URL: z.string().url().optional(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format())
  throw parsedEnv.error
}

export const env = parsedEnv.data
