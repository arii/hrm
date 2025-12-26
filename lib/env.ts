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

// Conditionally create a partial schema for the test environment
const schema =
  process.env.NODE_ENV === 'test' ? baseSchema.partial() : baseSchema

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

// Cast the parsed data to the inferred type of the base schema.
// This is safe because in non-test environments, the schema is strict,
// and in test environments, the necessary variables are provided by the test script.
export const env = parsedEnv.data as z.infer<typeof baseSchema>
