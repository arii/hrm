/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useDebouncedVolume.test.ts
import { renderHook, act } from '@testing-library/react'
import useDebouncedVolume from '@/hooks/useDebouncedVolume'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useDebouncedVolume', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not update localStorage immediately', () => {
    renderHook(() => useDebouncedVolume(50, true))
    expect(window.localStorage.getItem('hrm-preferred-volume')).toBeNull()
  })

  it('should update localStorage after the debounce delay', () => {
    renderHook(() => useDebouncedVolume(75, true))

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(window.localStorage.getItem('hrm-preferred-volume')).toBe('75')
  })

  it('should only store the latest value after multiple rapid changes', () => {
    const { rerender } = renderHook(({ volume }) => useDebouncedVolume(volume, true), {
      initialProps: { volume: 30 },
    })

    rerender({ volume: 40 })
    rerender({ volume: 50 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(window.localStorage.getItem('hrm-preferred-volume')).toBe('50')
  })

  it('should not update localStorage if isLoaded is false', () => {
    renderHook(() => useDebouncedVolume(60, false))

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(window.localStorage.getItem('hrm-preferred-volume')).toBeNull()
  })
})
