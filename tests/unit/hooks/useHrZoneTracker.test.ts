/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useHrZoneTracker } from '@/hooks/useHrZoneTracker'

describe('useHrZoneTracker', () => {
  // Use Jest's fake timers to control setInterval and Date.now()
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return initial zone durations of zero', () => {
    const { result } = renderHook(() => useHrZoneTracker(100, 200, true))
    const allZeros = result.current.zoneDurations.every(
      (zone) => zone.duration === 0
    )
    expect(allZeros).toBe(true)
  })

  it('should not accumulate time when isActive is false', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => useHrZoneTracker(150, 200, isActive),
      { initialProps: { isActive: false } }
    )

    // Advance time, but should not accumulate as isActive is false
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current.zoneDurations[2].duration).toBe(0)

    // Activate and check accumulation
    rerender({ isActive: true })
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(5)

    // Deactivate again and ensure it stops
    rerender({ isActive: false })
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(5)
  })

  it('should accumulate time in the correct HR zone', () => {
    const { result, rerender } = renderHook(
      ({ heartRate }) => useHrZoneTracker(heartRate, 200, true),
      { initialProps: { heartRate: 110 } } // Zone 1
    )

    act(() => {
      jest.advanceTimersByTime(10000)
    })
    expect(result.current.zoneDurations[0].duration).toBeCloseTo(10)
    expect(result.current.zoneDurations[1].duration).toBe(0)

    // Switch to Zone 2
    rerender({ heartRate: 130 })
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current.zoneDurations[0].duration).toBeCloseTo(10)
    expect(result.current.zoneDurations[1].duration).toBeCloseTo(5)
  })

  it('should handle transitions between zones correctly', () => {
    const { result, rerender } = renderHook(
      ({ heartRate }) => useHrZoneTracker(heartRate, 200, true),
      { initialProps: { heartRate: 150 } } // Zone 3
    )

    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(3)

    // Switch to Zone 4
    rerender({ heartRate: 170 })
    act(() => {
      jest.advanceTimersByTime(7000)
    })
    // Old zone duration should not change
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(3)
    // New zone should accumulate time
    expect(result.current.zoneDurations[3].duration).toBeCloseTo(7)
  })

  it('should reset durations when reset is called', () => {
    const { result } = renderHook(() => useHrZoneTracker(170, 200, true)) // Use unambiguous Zone 4 HR

    act(() => {
      jest.advanceTimersByTime(10000)
    })
    expect(result.current.zoneDurations[3].duration).toBeGreaterThan(0)

    act(() => {
      result.current.reset()
    })

    const allZeros = result.current.zoneDurations.every(
      (zone) => zone.duration === 0
    )
    expect(allZeros).toBe(true)

    // Should not accumulate after reset if props don't change to re-activate
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    const allZerosAfter = result.current.zoneDurations.every(
      (zone) => zone.duration === 0
    )
    expect(allZerosAfter).toBe(true)
  })
})
