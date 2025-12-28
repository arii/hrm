/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useCookie from '@/hooks/useCookie'

describe('useCookie', () => {
  afterEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  it('should set and get a cookie', () => {
    const { result } = renderHook(() => useCookie('test-cookie', 'initial'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(document.cookie).toBe('test-cookie=%22new-value%22')
  })

  it('should return the initial value if the cookie is not set', () => {
    const { result } = renderHook(() => useCookie('test-cookie', 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('should handle JSON serialization', () => {
    const { result } = renderHook(() =>
      useCookie('test-cookie', { a: 1 })
    )

    act(() => {
      result.current[1]({ b: 2 })
    })

    expect(result.current[0]).toEqual({ b: 2 })
    expect(document.cookie).toBe('test-cookie=%7B%22b%22%3A2%7D')
  })
})
