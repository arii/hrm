// lib/csrf.ts
import { nanoid } from 'nanoid'

export const CSRF_HEADER_NAME = 'X-CSRF-Token'
export const CSRF_COOKIE_NAME = '__Host-csrf-token'

export function generateCsrfToken(): string {
  return nanoid(32)
}
