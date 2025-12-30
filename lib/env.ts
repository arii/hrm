import { z } from 'zod'

const baseSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_DEBUG: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  TESTING: z
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

const productionSchema = baseSchema.extend({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
})

const testingSchema = baseSchema.extend({
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
})

const buildSchema = baseSchema.extend({
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
})

let schema = productionSchema
if (process.env.NODE_ENV === 'test' || process.env.TESTING === 'true') {
  schema = testingSchema
}
if (process.env.npm_lifecycle_event === 'build') {
  schema = buildSchema
}

const parsedEnv = schema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(parsedEnv.error.format(), null, 2)
  )
  process.exit(1)
}

export const env = parsedEnv.data
