import { z } from 'zod'

const envSchema = z
  .object({
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
    // The maximum number of concurrent WebSocket connections allowed from a single IP address.
    // Helps prevent simple denial-of-service attacks.
    WS_MAX_CONNECTIONS: z.coerce
      .number()
      .int()
      .positive()
      .default(1000)
      .describe(
        'Maximum number of concurrent WebSocket connections allowed from a single IP address.'
      ),
    SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().default(5000),
    SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.coerce.number().default(10000),
    // The time in milliseconds the server waits before cleaning up a disconnected client's session.
    // Allows for brief disconnects (e.g., page refresh) without losing session data.
    WEBSOCKET_GRACE_PERIOD_MS: z.coerce
      .number()
      .int()
      .positive()
      .max(60000) // Capped at 1 minute to prevent excessive memory usage
      .default(5000)
      .describe(
        "Grace period in milliseconds before cleaning up a disconnected client's session."
      ),
    // The interval at which the server's "watchdog" checks for and terminates stale connections.
    // This is the primary mechanism for preventing resource leaks from "zombie" connections.
    WEBSOCKET_WATCHDOG_INTERVAL: z.coerce
      .number()
      .int()
      .positive()
      .min(5000) // Must be at least 5 seconds to avoid overly aggressive termination
      .default(30000)
      .describe(
        'Interval in milliseconds for the WebSocket watchdog to check for stale connections.'
      ),
    GEMINI_MODEL_FALLBACKS: z.string().optional(),
    ANALYZE: z.string().optional(),
    TESTING: z.string().optional(),
    IS_DEPLOYMENT: z.string().optional(),
    WS_URL: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
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
