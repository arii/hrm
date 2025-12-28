/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useCookie from '@/hooks/useCookie'
import { getCookie, setCookie } from '@/utils/cookie'
import * as csrf from '@/lib/csrf'

// Mock the CSRF module as the hook depends on it for side effects
jest.mock('@/lib/csrf', () => ({
  generateCsrfToken: jest.fn(() => 'mock-csrf-token'),
  CSRF_COOKIE_NAME: 'csrf-token',
}))

describe('useCookie Hook', () => {
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
    jest.clearAllMocks()
  })

  it('should initialize with the initial value if no cookie is set', () => {
    const { result } = renderHook(() => useCookie('test-key', 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('should initialize with the value from an existing cookie', () => {
    setCookie('test-key', JSON.stringify('existing-value'))
    const { result } = renderHook(() => useCookie('test-key', 'initial'))
    expect(result.current[0]).toBe('existing-value')
  })

  it('should update the cookie and state when setValue is called', () => {
    const { result } = renderHook(() => useCookie('test-key', 'initial'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(JSON.parse(decodeURIComponent(getCookie('test-key')!))).toBe(
      'new-value'
    )
  })

  it('should handle object values correctly', () => {
    const { result } = renderHook(() => useCookie('test-key', { a: 1 }))

    act(() => {
      result.current[1]({ a: 2, b: 'test' })
    })

    expect(result.current[0]).toEqual({ a: 2, b: 'test' })
    expect(JSON.parse(decodeURIComponent(getCookie('test-key')!))).toEqual({
      a: 2,
      b: 'test',
    })
  })

  it('should handle functional updates', () => {
    const { result } = renderHook(() => useCookie('test-key', 10))

    act(() => {
      result.current[1]((prev) => prev + 5)
    })

    expect(result.current[0]).toBe(15)
    expect(JSON.parse(decodeURIComponent(getCookie('test-key')!))).toBe(15)
  })

  it('should clear the cookie when value is set to null', () => {
    setCookie('test-key', JSON.stringify('some-value'))
    const { result } = renderHook(() =>
      useCookie<string | null>('test-key', 'some-value')
    )

    act(() => {
      result.current[1](null)
    })

    expect(result.current[0]).toBe(null)
    expect(getCookie('test-key')).toBeUndefined()
  })

  it('should initialize with the initial value if cookie parsing fails', () => {
    // Set a malformed cookie
    document.cookie = 'test-key=malformed-json'
    const { result } = renderHook(() => useCookie('test-key', 'initial'))

    expect(result.current[0]).toBe('initial')
  })

  it('should remove a malformed cookie upon initialization', () => {
    document.cookie = 'test-key=malformed-json; path=/'
    renderHook(() => useCookie('test-key', 'initial'))
    expect(getCookie('test-key')).toBeUndefined()
  })

  it('should set a CSRF token cookie on initial render if one does not exist', () => {
    renderHook(() => useCookie('any-key', 'any-value'))
    expect(getCookie(csrf.CSRF_COOKIE_NAME)).toBe('mock-csrf-token')
  })

  it('should not overwrite an existing CSRF token cookie', () => {
    setCookie(csrf.CSRF_COOKIE_NAME, 'existing-csrf-token')
    renderHook(() => useCookie('any-key', 'any-value'))
    expect(getCookie(csrf.CSRF_COOKIE_NAME)).toBe('existing-csrf-token')
    expect(csrf.generateCsrfToken).not.toHaveBeenCalled()
  })
})
