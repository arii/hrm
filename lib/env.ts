import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_DEBUG: z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional(),
  TESTING: z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.string().transform(Number).default('3000'),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.string().transform(Number).default('10000'),
})

export const env = envSchema.parse(process.env)
