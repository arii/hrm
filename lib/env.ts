import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    NEXTAUTH_SECRET: z.string(),
    NEXTAUTH_URL: z.string().url(),
    BASE_URL: z.string().url().optional(),
    SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
    SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
    SPOTIFY_CALLBACK_URL: z.string().url().optional(),
    INTERNAL_TOKEN_DELIVERY_SECRET: z.string().optional(),
    SPOTIFY_DEBUG: z.string().optional(),
    CI: z.string().optional(),
    GOOGLE_DOC_WORKOUT_URL: z.string().url().optional(),
    GOOGLE_DOC_IFRAME_URL: z.string().url().optional(),
    NEXT_PUBLIC_USE_NATIVE_TABLE: z
      .preprocess((val) => {
        if (typeof val === 'string') return val.toLowerCase() === 'true'
        return val === true
      }, z.boolean())
      .default(false),
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
    WEBSOCKET_GRACE_PERIOD_MS: z.coerce.number().default(5000),
    WEBSOCKET_WATCHDOG_INTERVAL: z.coerce.number().default(30000),
    NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS: z.coerce.number().default(8),
    GEMINI_MODEL_FALLBACKS: z.string().optional(),
    ANALYZE: z.string().optional(),
    TESTING: z.string().optional(),
    IS_DEPLOYMENT: z.string().optional(),
    WS_URL: z.string().url().optional(),
    HRM_LIVE_WINDOW_SIZE: z.coerce.number().int().min(1).default(600),
  })
  .superRefine((data, ctx) => {
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
    if (data.NODE_ENV === 'production' && data.NEXTAUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXTAUTH_SECRET'],
        message:
          'NEXTAUTH_SECRET must be at least 32 characters long in production.',
      })
    }

    if (data.NODE_ENV !== 'production' && data.NEXTAUTH_SECRET.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXTAUTH_SECRET'],
        message: 'NEXTAUTH_SECRET is required.',
      })
    }
  })
  .transform((data) => {
    if (!data.SPOTIFY_CALLBACK_URL && data.NEXTAUTH_URL) {
      data.SPOTIFY_CALLBACK_URL = `${data.NEXTAUTH_URL}/api/auth/callback/spotify`
    }
    return data
  })

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format())
  throw parsedEnv.error
}

export const env = parsedEnv.data

export { envSchema }
