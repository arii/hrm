import { z } from 'zod'

const schema = z.object({
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
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
})

let envInstance: z.infer<typeof schema>

function validateAndGetEnv() {
  if (envInstance) {
    return envInstance
  }

  const parsedEnv = schema.safeParse(process.env)

  if (!parsedEnv.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(parsedEnv.error.format(), null, 2)
    )
    process.exit(1)
  }

  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.TESTING !== 'true' &&
    process.env.npm_lifecycle_event !== 'build'
  ) {
    if (!parsedEnv.data.SPOTIFY_CLIENT_ID) {
      console.error('❌ Missing SPOTIFY_CLIENT_ID')
      process.exit(1)
    }
    if (!parsedEnv.data.SPOTIFY_CLIENT_SECRET) {
      console.error('❌ Missing SPOTIFY_CLIENT_SECRET')
      process.exit(1)
    }
  }

  envInstance = parsedEnv.data
  return envInstance
}

export const env = new Proxy(
  {},
  {
    get(_target, prop: keyof z.infer<typeof schema>) {
      return validateAndGetEnv()[prop]
    },
  }
) as z.infer<typeof schema>
