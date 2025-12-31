import { z, ZodError } from 'zod'

/**
 * The **unvalidated** environment variables.
 * We use a record of strings, as that's what `process.env` provides.
 *
 * @see https://github.com/colinhacks/zod/issues/2183#issuecomment-1424911139
 */
const envRecord = {
  // We need to access the HOST from the env, but its not prefixed with NEXT_PUBLIC_
  // so we need to add it here manually.
  HOST: process.env.HOST,
  ...process.env,
} as const

const serverSchema = z.object({
  /**
   * The current environment.
   */
  NODE_ENV: z.enum(['development', 'production', 'test']),
  /**
   * The port the app is running on.
   */
  PORT: z.coerce.number().int().positive().optional(),
  HOST: z.string().optional(),
  /**
   * The base URL of the app.
   */
  NEXTAUTH_URL: z.string().url(),
  /**
   * The secret for NextAuth.
   * @see https://next-auth.js.org/configuration/options#secret
   */
  NEXTAUTH_SECRET: z.string(),
  /**
   * The Spotify client ID.
   */
  SPOTIFY_CLIENT_ID: z.string(),
  /**
   * The Spotify client secret.
   */
  SPOTIFY_CLIENT_SECRET: z.string(),
  /**
   * The Spotify refresh token.
   */
  SPOTIFY_REFRESH_TOKEN: z.string().optional(),
  /**
   * The encryption key for the Spotify refresh token.
   */
  ENCRYPTION_KEY: z.string(),
  /**
   * The URL to redirect to after Spotify login.
   */
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().int().positive().optional(),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.coerce.number().int().positive().optional(),
  WEBSOCKET_GRACE_PERIOD_MS: z.coerce.number().int().positive().optional(),
})

const clientSchema = z.object({
  /**
   * The URL of the WebSocket server.
   * This is a public variable that will be exposed to the client.
   */
  NEXT_PUBLIC_WS_URL: z.string().url(),
  /**
   * The URL of the app.
   * This is a public variable that will be exposed to the client.
   *
   * @example http://localhost:3000
   */
  NEXT_PUBLIC_BASE_URL: z.string().url(),
})

const formatErrors = (errors: ZodError) => {
  return Object.entries(
    errors.flatten().fieldErrors as Record<string, string[] | undefined>
  )
    .map(([name, value]) => {
      if (value) {
        return `❌ ${name}: ${value.join(', ')}`
      }
      return null
    })
    .filter(Boolean)
}

const isTest = process.env.NODE_ENV === 'test'
const isBuild = process.env.npm_lifecycle_event === 'build'
const skipValidation = isTest || isBuild || !!process.env.SKIP_ENV_VALIDATION

const finalServerSchema = skipValidation ? serverSchema.partial() : serverSchema
const finalClientSchema = skipValidation ? clientSchema.partial() : clientSchema

const finalSchema = finalServerSchema.merge(finalClientSchema)

const parsed = finalSchema.safeParse(envRecord)

if (parsed.success === false) {
  // We can't use the logger here, because the logger depends on the env variables.
  console.error('❌ Invalid environment variables:\n', ...formatErrors(parsed.error))
  process.exit(1)
}

/**
 * The validated environment variables.
 *
 * @example
 * ```ts
 * import { env } from '~/lib/env'
 *
 * export const MyComponent = () => {
 *  return <div>{env.NEXT_PUBLIC_WS_URL}</div>
 * }
 * ```
 */
export const env = parsed.data
