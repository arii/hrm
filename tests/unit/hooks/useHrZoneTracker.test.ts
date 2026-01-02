/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useHrZoneTracker } from '@/hooks/useHrZoneTracker'

let time: number
beforeEach(() => {
  time = Date.now()
  jest.spyOn(Date, 'now').mockImplementation(() => time)
})

afterEach(() => {
  jest.restoreAllMocks()
})

const advanceTime = (seconds: number) => {
  time += seconds * 1000
}

describe('useHrZoneTracker', () => {
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
      { initialProps: { isActive: true } }
    )
    act(() => {
      advanceTime(5)
      rerender({ isActive: true })
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(5)

    act(() => {
      rerender({ isActive: false })
      advanceTime(10)
      rerender({ isActive: false })
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(5)
  })

  it('should accumulate time in the correct HR zone', () => {
    const { result, rerender } = renderHook(
      ({ heartRate }) => useHrZoneTracker(heartRate, 200, true),
      { initialProps: { heartRate: 110 } } // Zone 1
    )

    act(() => {
      advanceTime(10)
      rerender({ heartRate: 110 })
    })
    expect(result.current.zoneDurations[0].duration).toBeCloseTo(10)
    expect(result.current.zoneDurations[1].duration).toBe(0)

    act(() => {
      rerender({ heartRate: 130 }) // Zone 2
      advanceTime(5)
      rerender({ heartRate: 130 })
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
      advanceTime(3)
      rerender({ heartRate: 150 })
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(3)

    act(() => {
      rerender({ heartRate: 170 }) // Zone 4
      advanceTime(7)
      rerender({ heartRate: 170 })
    })
    expect(result.current.zoneDurations[2].duration).toBeCloseTo(3)
    expect(result.current.zoneDurations[3].duration).toBeCloseTo(7)
  })

  it('should reset durations when reset is called', () => {
    const { result, rerender } = renderHook(
      ({ heartRate }) => useHrZoneTracker(heartRate, 200, true),
      { initialProps: { heartRate: 160 } } // Zone 4
    )

    act(() => {
      advanceTime(10)
      rerender({ heartRate: 160 })
    })
    expect(result.current.zoneDurations[3].duration).toBeGreaterThan(0)

    act(() => {
      result.current.reset()
    })

    rerender({ heartRate: 160 })
    const allZeros = result.current.zoneDurations.every(
      (zone) => zone.duration === 0
    )
    expect(allZeros).toBe(true)
  })
})
