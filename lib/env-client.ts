/**
 * Client-safe environment access (#9140).
 *
 * `lib/env.ts` requires server-only secrets (NEXTAUTH_SECRET) and throws in
 * the browser, so client code cannot import it. This module centralizes the
 * variables available in the browser bundle.
 *
 * NOTE: reads use direct `process.env.X` member access, exactly like the
 * call sites they replace. A bare `process.env` object read (e.g. for
 * schema parsing) has different bundler semantics and must not be used
 * here — member access is what the bundler inlines per key.
 */
export const clientEnv = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  NEXT_PUBLIC_TESTING: process.env.NEXT_PUBLIC_TESTING,
} as const
