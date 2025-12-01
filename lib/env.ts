import { z } from 'zod';

const envSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),
  PORT: z.coerce.number().optional(),
});

export const env = envSchema.parse(process.env);
