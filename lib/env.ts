import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  SPOTIFY_DEBUG: z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional(),
})

const testEnvSchema = envSchema.partial({
  NEXTAUTH_URL: true,
  NEXTAUTH_SECRET: true,
  SPOTIFY_CLIENT_ID: true,
  SPOTIFY_CLIENT_SECRET: true,
})

export const env = process.env.NODE_ENV === 'test'
  ? testEnvSchema.parse(process.env)
  : envSchema.parse(process.env)
