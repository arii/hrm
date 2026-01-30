/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useCalorieTracker.test.ts

import { renderHook, act } from '@testing-library/react'
import { useCalorieTracker } from '../../../hooks/useCalorieTracker'
import * as calorieEstimation from '../../../lib/calorie-estimation'

// Mock the calorie estimation library
jest.mock('../../../lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

const mockedEstimateCaloriesBurned =
  calorieEstimation.estimateCaloriesBurned as jest.Mock

describe('useCalorieTracker', () => {
  const props = { age: 30, weightKg: 70, gender: 'FEMALE' as const }

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

  it('should not calculate calories on the first heart rate process', () => {
    const { result } = renderHook(() => useCalorieTracker(props))
    act(() => {
      result.current.processHeartRate(120)
    })
    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(mockedEstimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should calculate calories burned on subsequent heart rate processes', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(120)
    })

    act(() => {
      jest.advanceTimersByTime(1000) // 1 second later
      result.current.processHeartRate(125)
    })

    const expectedCaloriesPerSecond = 10 / 60 // 10 calories per minute / 60 seconds
    expect(result.current.totalCaloriesBurned).toBeCloseTo(
      expectedCaloriesPerSecond
    )
    expect(result.current.calorieHistory).toHaveLength(1)
    expect(result.current.calorieHistory[0].caloriesPerSecond).toBeCloseTo(
      expectedCaloriesPerSecond
    )
    expect(mockedEstimateCaloriesBurned).toHaveBeenCalledTimes(1)
  })

  it('should pass gender to the estimation function', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      result.current.processHeartRate(120) // First call to set timestamp
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(125)
    })

    expect(mockedEstimateCaloriesBurned).toHaveBeenCalledWith(
      expect.objectContaining({
        gender: 'FEMALE',
      })
    )
  })

  it('should reset the calorie tracker state', () => {
    const { result } = renderHook(() => useCalorieTracker(props))

    act(() => {
      jest.setSystemTime(new Date())
      result.current.processHeartRate(120)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(125)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.totalCaloriesBurned).toBe(0)
    expect(result.current.calorieHistory).toEqual([])
  })
})
