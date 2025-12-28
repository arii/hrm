// lib/csrf.ts
import { nanoid } from 'nanoid'

export const CSRF_HEADER_NAME = 'X-CSRF-Token'
export const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-csrf-token' : 'csrf-token'

export function generateCsrfToken(): { token: string; secret: string } {
  const secret = nanoid(32)
  const token = nanoid(32)
  // This check is problematic in a server-side context
  // Disabling for now as the re-generation is an edge case
  // while (getCookie(CSRF_COOKIE_NAME) === token) {
  //   token = nanoid(32)
  // }
  return { token, secret }
}

export function validateCsrfToken(
  token: string | undefined,
  secret: string | undefined
): boolean {
  if (!token || !secret) {
    return false
  }
  // Simple comparison for now. Could be enhanced with HMAC.
  return token.length > 0 && token === secret
}
