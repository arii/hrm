import { renderHook, act } from '@testing-library/react'
import { useTimeAgo } from '@/hooks/useTimeAgo'

describe('useTimeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return an empty string if no timestamp is provided', () => {
    const { result } = renderHook(() => useTimeAgo(undefined))
    expect(result.current).toBe('')
  })

  it('should return "just now" for a recent timestamp', () => {
    const { result } = renderHook(() => useTimeAgo(Date.now()))
    expect(result.current).toBe('just now')
  })

  it('should return "X seconds ago" for a timestamp a few seconds ago', () => {
    const timestamp = Date.now() - 10 * 1000 // 10 seconds ago
    const { result } = renderHook(() => useTimeAgo(timestamp))
    expect(result.current).toBe('10 seconds ago')
  })

  it('should update the time ago string over time', () => {
    const timestamp = Date.now()
    const { result } = renderHook(() => useTimeAgo(timestamp))

    expect(result.current).toBe('just now')

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current).toBe('5 seconds ago')
  })

  it('should handle longer durations', () => {
    const timestamp = Date.now() - 65 * 1000 // 1 minute 5 seconds ago
    const { result } = renderHook(() => useTimeAgo(timestamp))
    expect(result.current).toBe('1 minute ago')
  })
})
