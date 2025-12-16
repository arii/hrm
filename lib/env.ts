// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_USE_NATIVE_TABLE: z
    .string()
    .transform((val) => val === 'true')
    .default(false),
})

export const env = envSchema.parse(process.env)
