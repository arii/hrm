/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useCalorieTracker.test.ts

import { renderHook, act } from '@testing-library/react'
import { useCalorieTracker } from '../../../hooks/useCalorieTracker'
import * as calorieEstimation from '../../../lib/calorie-estimation'
import {
  MIN_HR_FOR_CALORIE_CALCULATION,
  MAX_CALORIES_PER_WORKOUT,
} from '../../../constants/calorie-thresholds'

// Mock the calorie estimation library
jest.mock('../../../lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

const mockedEstimateCaloriesBurned =
  calorieEstimation.estimateCaloriesBurned as jest.Mock

describe('useCalorieTracker', () => {
  const props = { age: 30, weightKg: 70, smoothingWindow: 3 }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Mock to return 10 calories per minute
    mockedEstimateCaloriesBurned.mockImplementation(
      ({ durationMinutes }) => 10 * durationMinutes
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with zero calories and empty history', () => {
    const { result } = renderHook(() => useCalorieTracker(props))
    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(result.current.calorieHistory).toEqual([])
  })

  it('should record an initial data point with zero calories', () => {
    const { result } = renderHook(() => useCalorieTracker(props))
    act(() => {
      result.current.processHeartRate(120)
    })
    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(result.current.calorieHistory).toHaveLength(1)
    expect(result.current.calorieHistory[0].caloriesPerSecond).toBe(0)
    expect(mockedEstimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should calculate calories burned on subsequent heart rate processes', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(120) // Initial call
    })

    act(() => {
      jest.advanceTimersByTime(1000) // 1 second later
      result.current.processHeartRate(120) // Second call
    })

    const expectedCaloriesPerSecond = 10 / 60 // 10 calories/min -> calories/sec
    expect(result.current.totalCaloriesBurned).toBeCloseTo(
      expectedCaloriesPerSecond
    )
    // Expect two data points: the initial zero-calorie one and the calculated one
    expect(result.current.calorieHistory).toHaveLength(2)
    expect(result.current.calorieHistory[0].caloriesPerSecond).toBe(0)
    expect(result.current.calorieHistory[1].caloriesPerSecond).toBeCloseTo(
      expectedCaloriesPerSecond
    )
    expect(mockedEstimateCaloriesBurned).toHaveBeenCalledTimes(1)
  })

  it('should apply SMA smoothing to heart rate values', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(100) // HR history: [100], SMA: 100
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(110) // HR history: [100, 110], SMA: 105
    })

    expect(mockedEstimateCaloriesBurned).toHaveBeenCalledWith(
      expect.objectContaining({ heartRate: 105 })
    )

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(120) // HR history: [100, 110, 120], SMA: 110
    })

    expect(mockedEstimateCaloriesBurned).toHaveBeenLastCalledWith(
      expect.objectContaining({ heartRate: 110 })
    )

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(130) // HR history: [110, 120, 130] (window=3), SMA: 120
    })

    expect(mockedEstimateCaloriesBurned).toHaveBeenLastCalledWith(
      expect.objectContaining({ heartRate: 120 })
    )
  })

  it('should not record calories if heart rate is below threshold', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(MIN_HR_FOR_CALORIE_CALCULATION - 5)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(MIN_HR_FOR_CALORIE_CALCULATION - 5)
    })

    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(mockedEstimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should cap total calories at MAX_CALORIES_PER_WORKOUT', () => {
    // Mock to return 11000 calories per minute to exceed limit quickly
    mockedEstimateCaloriesBurned.mockImplementation(() => 11000)

    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(120)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(120)
    })

    expect(result.current.totalCaloriesBurned).toBe(MAX_CALORIES_PER_WORKOUT)
  })

  it('should reset the calorie tracker state including HR history', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(100)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(200) // SMA: 150
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(result.current.calorieHistory).toEqual([])

    // Verify history reset by processing HR again
    act(() => {
      result.current.processHeartRate(100)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(100)
    })

    expect(mockedEstimateCaloriesBurned).toHaveBeenLastCalledWith(
      expect.objectContaining({ heartRate: 100 })
    )
  })
})
