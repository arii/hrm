import { z } from 'zod'

const schema = z.object({
  RATE_LIMIT_SPOTIFY_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_SPOTIFY_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  RATE_LIMIT_INTERNAL_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_INTERNAL_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_GENERAL_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AUTH_WINDOW_MINUTES: z.coerce.number().int().positive().default(5),
  WS_MAX_CONNECTIONS: z.coerce.number().int().positive().default(5),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
})

export const env = schema.parse(process.env)
