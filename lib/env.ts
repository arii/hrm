import { z } from 'zod';

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  PORT: z.coerce.number().optional(),
  HOST: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

export const env = envSchema.parse(process.env);
