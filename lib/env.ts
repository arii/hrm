// File: lib/env.ts
import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env.local file
config({ path: '.env.local' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  // Add other server-side environment variables here
});

export const env = envSchema.parse(process.env);