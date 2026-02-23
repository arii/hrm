import { z } from 'zod'

const isServer = typeof window === 'undefined'

const booleanSchema = z.preprocess((val) => {
  if (typeof val === 'string') return val.toLowerCase() === 'true'
  return val === true
}, z.boolean())

export const envObjectSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  BASE_URL: z.string().url().optional(),
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),
  INTERNAL_TOKEN_DELIVERY_SECRET: z.string().optional(),
  SPOTIFY_DEBUG: z.string().optional(),
  CI: z.string().optional(),
  GOOGLE_DOC_WORKOUT_URL: z.string().url().optional(),
  NEXT_PUBLIC_USE_NATIVE_TABLE: booleanSchema.default(false),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((url) => url?.replace(/\/$/, '')),
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
  WEBSOCKET_GRACE_PERIOD_MS: z.coerce.number().default(5000),
  WEBSOCKET_WATCHDOG_INTERVAL: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
  NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS: z.coerce.number().default(8),
  GEMINI_MODEL_FALLBACKS: z.string().optional(),
  ANALYZE: booleanSchema.default(false),
  TESTING: booleanSchema.default(false),
  NEXT_PUBLIC_TESTING: booleanSchema.optional(),
  IS_DEPLOYMENT: booleanSchema.default(false),
  LOG_LEVEL: z.string().optional(),
  WS_URL: z.string().url().optional(),
  HRM_LIVE_WINDOW_SIZE: z.coerce.number().int().min(1).default(600),
  npm_package_version: z.string().optional(),
  IGNORE_BUILD_ERRORS: booleanSchema.default(false),
  INCLUDE_MOBILE: booleanSchema.default(false),
  SKIP_WEBSERVER: booleanSchema.default(false),
  SKIP_BUILD: booleanSchema.default(false),
})

const envSchema = envObjectSchema
  .superRefine((data, ctx) => {
    // Only perform strict validation on the server.
    // On the client, many of these variables will be missing.
    if (!isServer) return

    // Paired validation for Spotify credentials
    if (data.SPOTIFY_CLIENT_ID && !data.SPOTIFY_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SPOTIFY_CLIENT_SECRET'],
        message:
          'SPOTIFY_CLIENT_SECRET is required when SPOTIFY_CLIENT_ID is set.',
      })
    }
    if (!data.SPOTIFY_CLIENT_ID && data.SPOTIFY_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SPOTIFY_CLIENT_ID'],
        message:
          'SPOTIFY_CLIENT_ID is required when SPOTIFY_CLIENT_SECRET is set.',
      })
    }

    // If Spotify credentials are provided, a callback URL must be available.
    if (data.SPOTIFY_CLIENT_ID && data.SPOTIFY_CLIENT_SECRET) {
      if (!data.SPOTIFY_CALLBACK_URL && !data.NEXTAUTH_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SPOTIFY_CALLBACK_URL'],
          message:
            'SPOTIFY_CALLBACK_URL is required when SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set, but it could not be derived from NEXTAUTH_URL.',
        })
      }
    }

    // Production-ready NEXTAUTH_SECRET validation
    if (data.NODE_ENV === 'production') {
      if (!data.NEXTAUTH_SECRET || data.NEXTAUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXTAUTH_SECRET'],
          message:
            'NEXTAUTH_SECRET must be at least 32 characters long in production.',
        })
      }
      if (!data.NEXTAUTH_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXTAUTH_URL'],
          message: 'NEXTAUTH_URL is required in production.',
        })
      }
    }
  })
  .transform((data) => {
    // Provide a default NEXTAUTH_URL for non-production environments if not set
    if (!data.NEXTAUTH_URL && data.NODE_ENV !== 'production') {
      data.NEXTAUTH_URL = 'http://localhost:3000'
    }

    if (!data.SPOTIFY_CALLBACK_URL && data.NEXTAUTH_URL) {
      data.SPOTIFY_CALLBACK_URL = `${data.NEXTAUTH_URL}/api/auth/callback/spotify`
    }

    return data
  })

const getEnvSource = () => {
  if (isServer) return process.env

  /**
   * Client-side: explicitly map variables for Next.js static replacement.
   * IMPORTANT: Any new NEXT_PUBLIC_ variable added to the schema MUST be
   * added here as well, otherwise it will not be available in the browser.
   * This is due to how Next.js performs static analysis for environment variables.
   */
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_USE_NATIVE_TABLE: process.env.NEXT_PUBLIC_USE_NATIVE_TABLE,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS:
      process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
    NEXT_PUBLIC_TESTING: process.env.NEXT_PUBLIC_TESTING,
  }
}

const parsedEnv = envSchema.safeParse(getEnvSource())

if (!parsedEnv.success) {
  if (isServer) {
    console.error('❌ Invalid environment variables:', parsedEnv.error.format())
    throw parsedEnv.error
  } else {
    // On the client, we log a warning but don't throw to avoid crashing the app.
    // However, we must be aware that some variables might be missing or invalid.
    console.warn(
      '⚠️ Invalid client-side environment variables:',
      JSON.stringify(parsedEnv.error.format(), null, 2)
    )
  }
}

export const env: z.infer<typeof envSchema> = parsedEnv.success
  ? parsedEnv.data
  : ({
      NODE_ENV: 'production',
      NEXT_PUBLIC_USE_NATIVE_TABLE: false,
      NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS: 8,
      WEBSOCKET_WATCHDOG_INTERVAL: 30000,
      NEXT_PUBLIC_API_URL: '',
      NEXT_PUBLIC_WS_URL: '',
      NEXT_PUBLIC_TESTING: false,
      // Add other essential defaults for the client if needed
    } as z.infer<typeof envSchema>)

export { envSchema }
