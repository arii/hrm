/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useCalorieCalculator.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import * as calorieEstimation from '@/lib/calorie-estimation'

// Mock the calorie estimation library
jest.mock('@/lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

const mockEstimateCaloriesBurned =
  calorieEstimation.estimateCaloriesBurned as jest.Mock

describe('useCalorieCalculator', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEstimateCaloriesBurned.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with 0 calories', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 70 })
    )
    expect(result.current.calories).toBe(0)
  })

  it('should not calculate calories if HR is not processed', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 70 })
    )
    expect(result.current.calories).toBe(0)
  })

  it('should cap calories at the MAX_CALORIES_PER_WORKOUT threshold', () => {
    mockEstimateCaloriesBurned.mockReturnValue(5000) // High calorie burn
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 70 })
    )

    act(() => {
      result.current.processHeartRate(150)
      jest.advanceTimersByTime(2000)
      result.current.processHeartRate(150)
      jest.advanceTimersByTime(2000)
      result.current.processHeartRate(150)
    })

    // The MAX_CALORIES_PER_WORKOUT is 10000.
    // Each call burns 5000, so the third call should be capped.
    expect(result.current.calories).toBe(10000)
  })

  it('should reset calories and internal state', () => {
    mockEstimateCaloriesBurned.mockReturnValue(10)
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 70 })
    )

    act(() => {
      result.current.processHeartRate(120)
      jest.advanceTimersByTime(2000)
      result.current.processHeartRate(120)
    })

    expect(result.current.calories).toBeGreaterThan(0)

    act(() => {
      result.current.reset()
    })

    expect(result.current.calories).toBe(0)

    // After reset, the first processHeartRate should not calculate calories
    // because the timestamp history is cleared.
    mockEstimateCaloriesBurned.mockClear()
    act(() => {
      result.current.processHeartRate(120)
    })
    expect(mockEstimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should process heart rate and accumulate calories over time', () => {
    mockEstimateCaloriesBurned.mockReturnValue(10) // Burn 10 calories per call
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 70 })
    )

    act(() => {
      result.current.processHeartRate(120)
      jest.advanceTimersByTime(2000)
      result.current.processHeartRate(120)
    })

    expect(result.current.calories).toBeGreaterThan(0)
    expect(mockEstimateCaloriesBurned).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(2000)
      result.current.processHeartRate(120)
    })

    expect(result.current.calories).toBeGreaterThan(10)
    expect(mockEstimateCaloriesBurned).toHaveBeenCalledTimes(2)
  })

  it('should use smoothed heart rate for calculations', () => {
    mockEstimateCaloriesBurned.mockReturnValue(1)
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 70, smoothingWindow: 3 })
    )

    act(() => {
      result.current.processHeartRate(100)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(110)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(120)
    })

    // The smoothed HR should be (100 + 110 + 120) / 3 = 110
    expect(mockEstimateCaloriesBurned).toHaveBeenCalledWith(
      expect.objectContaining({
        heartRate: 110,
      })
    )
  })
})
