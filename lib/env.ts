import { z } from 'zod'

const fullEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  TESTING: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
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

// The type of the fully validated env object
type FullEnv = z.infer<typeof fullEnvSchema>

// During build, we only require the build-time variables
const buildTimeSchema = fullEnvSchema.partial({
  PORT: true,
  HOST: true,
  NEXTAUTH_URL: true,
  NEXTAUTH_SECRET: true,
  SPOTIFY_CLIENT_ID: true,
  SPOTIFY_CLIENT_SECRET: true,
  SPOTIFY_DEBUG: true,
  SPOTIFY_POLLING_INTERVAL_MS: true,
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: true,
  WEBSOCKET_GRACE_PERIOD_MS: true,
  MAX_WS_CLIENTS: true,
  NEXT_PUBLIC_WS_URL: true,
})

// We use a flag to determine if we are in the Next.js build process.
const isBuild = process.env.npm_lifecycle_event === 'build'

const schemaToUse = isBuild ? buildTimeSchema : fullEnvSchema
const parsedEnv = schemaToUse.safeParse(process.env)

if (isBuild && !parsedEnv.success) {
  console.error(
    '❌ Invalid build-time environment variables:',
    JSON.stringify(parsedEnv.error.format(), null, 2)
  )
  process.exit(1)
}

export const env = process.env as unknown as FullEnv

export const validateServerRuntimeEnv = () => {
  const runtimeParsedEnv = fullEnvSchema.safeParse(process.env)
  if (!runtimeParsedEnv.success) {
    console.error(
      '❌ Invalid server runtime environment variables:',
      JSON.stringify(runtimeParsedEnv.error.format(), null, 2)
    )
    process.exit(1)
  }
  // Now that we've validated, we can overwrite the potentially incomplete `env` object
  // with the fully validated one.
  Object.assign(env, runtimeParsedEnv.data)
}
