// lib/env.ts
import { z } from 'zod'

// Define the base schema without partials
const baseSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  HOST: z
    .string()
    .default(
      process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'
    ),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  SPOTIFY_DEBUG: z.coerce.boolean().optional(),
  SPOTIFY_POLLING_INTERVAL_MS: z.coerce.number().default(3000),
  SPOTIFY_DEVICE_POLLING_INTERVAL_MS: z.coerce.number().default(10000),
  TESTING: z.string().optional(),
})

// Create a new schema that is conditionally partial
let schema = baseSchema

if (process.env.NODE_ENV === 'test') {
  schema = baseSchema.partial()
}

const parsedEnv = schema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('Environment variable validation failed:')
  const fieldErrors = parsedEnv.error.flatten().fieldErrors
  // Use Object.keys to iterate in a type-safe way
  Object.keys(fieldErrors).forEach((field) => {
    // TypeScript now knows `field` is a key of `fieldErrors`
    console.error(
      `- ${field}: ${(fieldErrors[field as keyof typeof fieldErrors] ?? []).join(
        ', '
      )}`
    )
  })
  process.exit(1)
}

export const env = parsedEnv.data
