import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  SPOTIFY_DEBUG: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  TESTING: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().default(3000),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.coerce.number().default(10000),
  WEBSOCKET_GRACE_PERIOD_MS: z.coerce.number().default(5000),
  MAX_WS_CLIENTS: z.coerce.number().default(1000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  SPOTIFY_API_MAX_REQUESTS: z.coerce.number().default(30),
  INTERNAL_API_MAX_REQUESTS: z.coerce.number().default(100),
  GENERAL_API_MAX_REQUESTS: z.coerce.number().default(200),
  WS_MAX_CONNECTIONS: z.coerce.number().default(5),
})

export const env = envSchema.parse(process.env)
