import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  SPOTIFY_DEBUG: z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional(),
  TESTING: z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.string().default('3000').transform(Number),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.string().default('10000').transform(Number),
})

export const env = envSchema.parse(process.env)
