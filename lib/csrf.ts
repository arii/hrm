// lib/csrf.ts
import { nanoid } from 'nanoid'
import { getCookie } from '@/utils/cookie'

export const CSRF_HEADER_NAME = 'X-CSRF-Token'
export const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-csrf-token' : 'csrf-token'

export function generateCsrfToken(): string {
  let token = nanoid(32)
  // This check is problematic in a server-side context
  // Disabling for now as the re-generation is an edge case
  // while (getCookie(CSRF_COOKIE_NAME) === token) {
  //   token = nanoid(32)
  // }
  return token
}

export function validateCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false
  }
  return cookieToken === headerToken
}
