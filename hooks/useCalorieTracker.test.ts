import { act, renderHook } from '@testing-library/react-hooks'
import { useCalorieTracker } from '@/hooks/useCalorieTracker'

describe('useCalorieTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should correctly process heart rate data and calculate calories', () => {
    const { result } = renderHook(() =>
      useCalorieTracker({ age: 30, weightKg: 70 })
    )

    act(() => {
      result.current.processHeartRate(120)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    act(() => {
      result.current.processHeartRate(125)
    })

    expect(result.current.totalCaloriesBurned).toBeGreaterThan(0)
    expect(result.current.calorieHistory).toHaveLength(1)
  })

  it('should reset the calorie data', () => {
    const { result } = renderHook(() =>
      useCalorieTracker({ age: 30, weightKg: 70 })
    )

    act(() => {
      result.current.processHeartRate(120)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    act(() => {
      result.current.processHeartRate(125)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(result.current.calorieHistory).toHaveLength(0)
  })
})
