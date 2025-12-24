import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('127.0.0.1'),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  BASE_URL: z.string().url(),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_CALLBACK_URL: z.string().url(),
  INTERNAL_TOKEN_DELIVERY_SECRET: z.string().min(1),
  SPOTIFY_DEBUG: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default(false),
  CI: z
    .string()
    .transform((val) => val === 'true')
    .default(false),
  GOOGLE_DOC_WORKOUT_URL: z.string().url(),
  NEXT_PUBLIC_USE_NATIVE_TABLE: z
    .string()
    .transform((val) => val === 'true')
    .default(false),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  TESTING: z
    .string()
    .transform((val) => val === 'true')
    .default(false),
  INCLUDE_MOBILE: z
    .string()
    .transform((val) => val === 'true')
    .default(false),
})

try {
  envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    const { fieldErrors } = error.flatten()
    const message = Object.entries(fieldErrors)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    throw new Error(`Missing or invalid environment variables:\n${message}`)
  }
}

export const env = envSchema.parse(process.env)
