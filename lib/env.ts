import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.preprocess((val) => Number(val), z.number().default(3000)),
  HOST: z.string().default('0.0.0.0'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_DEBUG: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
})

export const env = envSchema.parse(process.env)

export function validateProductionEnv() {
  if (process.env.NODE_ENV === 'production') {
    const prodSchema = envSchema.required({
      NEXTAUTH_URL: true,
      NEXTAUTH_SECRET: true,
      SPOTIFY_CLIENT_ID: true,
      SPOTIFY_CLIENT_SECRET: true,
    })
    prodSchema.parse(process.env)
  }
}
