/**
 * Environment variable validation using Zod.
 *
 * This file defines a schema for environment variables that are used throughout the application.
 * It ensures that all required environment variables are set and have the correct type.
 *
 * Zod schema is exported and can be used to validate the environment variables at runtime.
 */
import { z } from 'zod'

// Helper for boolean-like strings
const booleanString = z.preprocess((val) => {
  if (typeof val === 'string') {
    const lower = val.toLowerCase()
    return lower === 'true' || lower === '1'
  }
  return val
}, z.boolean().optional())

const serverSchema = z.object({
  // --- Server Config ---
  NODE_ENV: z.enum(['development', 'production', 'test']),
  HOST: z.string().optional(),
  PORT: z.coerce.number().optional(),

  // --- NextAuth ---
  NEXTAUTH_URL: z.string().url().default('http://127.0.0.1:3000'),
  NEXTAUTH_SECRET: z.string().min(1).optional(),

  // --- Spotify Integration ---
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  SPOTIFY_CALLBACK_URL: z.string().url().optional(),
  SPOTIFY_DEBUG: booleanString,

  // --- Spotify Token Persistence ---
  SPOTIFY_TOKEN_CACHE_STRATEGY: z
    .enum(['persistence', 'persistent', 'ephemeral'])
    .optional(),
  SPOTIFY_TOKEN_PERSISTENCE: booleanString,

  // --- Internal Security ---
  INTERNAL_TOKEN_DELIVERY_SECRET: z.string().optional(),

  // --- WebSocket ---
  WEBSOCKET_URL: z.string().optional(),
})

// Client-side environment variables
// const clientSchema = z.object({
//   NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
// })

// Parse and validate the environment variables
const parsedServer = serverSchema.safeParse(process.env)

if (!parsedServer.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsedServer.error.flatten().fieldErrors
  )
  throw new Error('Invalid environment variables.')
}

// Augment NodeJS.ProcessEnv to get type-safe access to validated env vars
// declare global {
//   // eslint-disable-next-line @typescript-eslint/no-namespace
//   namespace NodeJS {
//     interface ProcessEnv extends z.infer<typeof serverSchema> {}
//   }
// }

export const env = parsedServer.data

export function validateProductionEnvironment() {
  if (env.NODE_ENV === 'production') {
    const productionSchema = z.object({
      NEXTAUTH_SECRET: z.string().min(1),
      SPOTIFY_CLIENT_ID: z.string().min(1),
      SPOTIFY_CLIENT_SECRET: z.string().min(1),
    });
    productionSchema.parse(env);
  }
}
