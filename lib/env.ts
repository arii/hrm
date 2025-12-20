import { z } from 'zod'

/**
 * A function to check for "truthy" values from environment variables.
 */
const isTruthy = (val: unknown): boolean => {
  if (typeof val === 'string') {
    return val.toLowerCase() === 'true' || val === '1'
  }
  return val === true || val === 1
}

/**
 * Server-side environment variables schema.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('127.0.0.1'),
  NEXTAUTH_SECRET: z
    .string()
    .min(1, { message: 'NEXTAUTH_SECRET is required' }),
  NEXTAUTH_URL: z.string().url({ message: 'NEXTAUTH_URL must be a valid URL' }).default('http://127.0.0.1:3000'),
  BASE_URL: z.string().url({ message: 'BASE_URL must be a valid URL' }).default('http://127.0.0.1:3000'),
  SPOTIFY_CLIENT_ID: z
    .string()
    .min(1, { message: 'SPOTIFY_CLIENT_ID is required' }),
  SPOTIFY_CLIENT_SECRET: z
    .string()
    .min(1, { message: 'SPOTIFY_CLIENT_SECRET is required' }),
  SPOTIFY_CALLBACK_URL: z
    .string()
    .url({ message: 'SPOTIFY_CALLBACK_URL must be a valid URL' }).default('http://127.0.0.1:3000/api/auth/callback/spotify'),
  INTERNAL_TOKEN_DELIVERY_SECRET: z
    .string()
    .min(1, { message: 'INTERNAL_TOKEN_DELIVERY_SECRET is required' }),
  SPOTIFY_DEBUG: z.preprocess(isTruthy, z.boolean().default(false)),
  CI: z.preprocess(isTruthy, z.boolean().default(false)),
  GOOGLE_DOC_WORKOUT_URL: z
    .string()
    .url({ message: 'GOOGLE_DOC_WORKOUT_URL must be a valid URL' }).default('https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'),
  ANALYZE: z.preprocess(isTruthy, z.boolean().default(false)),
})

/**
 * Client-side environment variables schema.
 *
 * @important All client-side variables must be prefixed with `NEXT_PUBLIC_`.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_API_URL must be a valid URL' })
    .optional(),
  NEXT_PUBLIC_WS_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_WS_URL must be a valid URL' })
    .optional(),
  NEXT_PUBLIC_USE_NATIVE_TABLE: z.preprocess(
    isTruthy,
    z.boolean().default(false)
  ),
  NEXT_PUBLIC_TESTING: z.preprocess(isTruthy, z.boolean().default(false)),
})

/**
 * Merged schema for all environment variables.
 */
const allSchema = serverSchema.merge(clientSchema)

type Env = z.infer<typeof allSchema>
type PublicEnv = z.infer<typeof clientSchema>

/**
 * Parsed and validated environment variables.
 * This will throw an error if the environment variables are invalid.
 */
const parsedEnv = allSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(parsedEnv.error.format(), null, 4)
  )
  process.exit(1)
}

/**
 * A type-safe object with all validated environment variables.
 */
export const env: Env = parsedEnv.data

/**
 * A type-safe object with only the public (client-side) environment variables.
 * This is used to expose environment variables to the client.
 */
export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_USE_NATIVE_TABLE: env.NEXT_PUBLIC_USE_NATIVE_TABLE,
  NEXT_PUBLIC_TESTING: env.NEXT_PUBLIC_TESTING,
}
