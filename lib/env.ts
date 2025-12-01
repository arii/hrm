// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
});

const testingSchema = envSchema.extend({
  NEXTAUTH_SECRET: z.string().optional(),
});

export const env =
  process.env.TESTING === 'true'
    ? testingSchema.parse(process.env)
    : envSchema.parse(process.env);
