import { renderHook, act } from '@testing-library/react'
import { useDataFreshness } from './useDataFreshness'

describe('useDataFreshness', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return false for a recent timestamp', () => {
    const { result } = renderHook(() => useDataFreshness(Date.now()))
    expect(result.current).toBe(false)
  })

  it('should return true for a null timestamp', () => {
    const { result } = renderHook(() => useDataFreshness(null))
    expect(result.current).toBe(true)
  })

  it('should return true for an old timestamp', () => {
    const oldTimestamp = Date.now() - 20 * 1000 // 20 seconds ago
    const { result } = renderHook(() => useDataFreshness(oldTimestamp))
    expect(result.current).toBe(true)
  })

  it('should update to stale after the threshold', () => {
    const { result } = renderHook(() => useDataFreshness(Date.now()))
    expect(result.current).toBe(false)

    act(() => {
      jest.advanceTimersByTime(16 * 1000) // 16 seconds
    })

    expect(result.current).toBe(true)
  })
})
