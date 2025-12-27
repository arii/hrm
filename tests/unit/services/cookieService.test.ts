/**
 * @jest-environment jsdom
 */
import { setCookie, getCookie } from '@/services/cookieService'

describe('cookieService', () => {
  afterEach(() => {
    // Clean up cookies after each test
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  it('should set and get a cookie', () => {
    setCookie('test', 'value')
    expect(getCookie('test')).toBe('value')
  })

  it('should return an empty string for a non-existent cookie', () => {
    expect(getCookie('non-existent')).toBe('')
  })

  it('should handle cookie expiration', () => {
    setCookie('test', 'value', -1)
    expect(getCookie('test')).toBe('')
  })
})
