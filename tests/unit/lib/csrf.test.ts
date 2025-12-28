/**
 * @jest-environment jsdom
 */
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
} from '@/lib/csrf'
import { getCookie, setCookie } from '@/utils/cookie'

// Mock the nanoid library to return a predictable value
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-token'),
}))

describe('CSRF Protection', () => {
  // Helper to clear all cookies
  const clearCookies = () => {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  }

  beforeEach(() => {
    clearCookies()
    jest.resetModules() // Clear module cache before each test
  })

  it('should generate a CSRF token', () => {
    const token = generateCsrfToken()
    expect(token).toBe('mock-nanoid-token')
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

  it('should use __Host- prefix in production', () => {
    process.env.NODE_ENV = 'production'
    const { CSRF_COOKIE_NAME: PROD_CSRF_COOKIE_NAME } =
      require('@/lib/csrf')
    expect(PROD_CSRF_COOKIE_NAME).toBe('__Host-csrf-token')
  })

  it('should not use __Host- prefix in development', () => {
    process.env.NODE_ENV = 'development'
    const { CSRF_COOKIE_NAME: DEV_CSRF_COOKIE_NAME } =
      require('@/lib/csrf')
    expect(DEV_CSRF_COOKIE_NAME).toBe('csrf-token')
  })
})
