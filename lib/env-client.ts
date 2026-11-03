import { z } from 'zod'

/**
 * Client-safe environment access (#9140).
 *
 * `lib/env.ts` requires server-only secrets (NEXTAUTH_SECRET) and throws in
 * the browser, so client code cannot import it. This module validates only
 * the variables available in the browser bundle: NODE_ENV plus the
 * NEXT_PUBLIC_* values used by client code. Server code must keep using
 * `lib/env.ts`, never this module.
 */
const clientEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_TESTING: z.string().optional(),
})

export const clientEnv = clientEnvSchema.parse(process.env)

export type ClientEnv = z.infer<typeof clientEnvSchema>
