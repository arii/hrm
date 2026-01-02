/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useHrZoneTracker } from '@/hooks/useHrZoneTracker'

describe('useHrZoneTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return initial zones when inactive', () => {
    const { result } = renderHook(() => useHrZoneTracker(120, 200, false))
    expect(result.current).toEqual([
      { zone: 1, name: 'Very Light', duration: 0, percentage: 0, color: 'grey.700' },
      { zone: 2, name: 'Light', duration: 0, percentage: 0, color: 'info.main' },
      { zone: 3, name: 'Moderate', duration: 0, percentage: 0, color: 'success.main' },
      { zone: 4, name: 'Hard', duration: 0, percentage: 0, color: 'warning.main' },
      { zone: 5, name: 'Maximum', duration: 0, percentage: 0, color: 'error.main' },
    ])
  })

  it('should track time spent in a zone', () => {
    const { result } = renderHook(() => useHrZoneTracker(130, 200, true))

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current[1].duration).toBeCloseTo(5)
    expect(result.current[1].percentage).toBe(100)
  })
})
