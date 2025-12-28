/**
 * @jest-environment jsdom
 */
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
} from '@/lib/csrf'
import { getCookie, setCookie } from '@/hooks/useCookie'

describe('CSRF Protection', () => {
  afterEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  it('should generate a CSRF token', () => {
    const token = generateCsrfToken()
    expect(token).toBe('test-nanoid')
  })

  it('should validate a correct CSRF token', () => {
    const token = generateCsrfToken()
    setCookie(CSRF_COOKIE_NAME, token)
    const cookieToken = getCookie(CSRF_COOKIE_NAME)
    const headerToken = token
    expect(validateCsrfToken(cookieToken, headerToken)).toBe(true)
  })

  it('should not validate an incorrect CSRF token', () => {
    const token = generateCsrfToken()
    setCookie(CSRF_COOKIE_NAME, token)
    const cookieToken = getCookie(CSRF_COOKIE_NAME)
    const headerToken = 'incorrect-token'
    expect(validateCsrfToken(cookieToken, headerToken)).toBe(false)
  })

  it('should not validate if the cookie token is missing', () => {
    const headerToken = generateCsrfToken()
    expect(validateCsrfToken(undefined, headerToken)).toBe(false)
  })

  it('should not validate if the header token is missing', () => {
    const token = generateCsrfToken()
    setCookie(CSRF_COOKIE_NAME, token)
    const cookieToken = getCookie(CSRF_COOKIE_NAME)
    expect(validateCsrfToken(cookieToken, undefined)).toBe(false)
  })
})
