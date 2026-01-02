/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useCalorieCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '../../../hooks/useCalorieCounter'
import * as calorieEstimation from '../../../lib/calorie-estimation'

jest.mock('../../../lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

describe('useCalorieCounter', () => {
  beforeEach(() => {
    // Enable fake timers
    jest.useFakeTimers()
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should calculate calories correctly over time', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, true))

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // After 1 second, we should have 1 calorie (1 call to estimate * 1 returned)
    expect(result.current.calories).toBe(1)
    expect(calorieEstimation.estimateCaloriesBurned).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // After 2 more seconds, total 3 calories
    expect(result.current.calories).toBe(3)
    expect(calorieEstimation.estimateCaloriesBurned).toHaveBeenCalledTimes(3)
  })

  it('should not calculate calories when isActive is false', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, false))

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.calories).toBe(0)
    expect(calorieEstimation.estimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should reset calories when resetCalories is called', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, true))

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBe(2)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
  })
  it('should accumulate calories correctly with changing HR', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isActive }) =>
        useCalorieCounter(heartRate, 35, 80, isActive),
      {
        initialProps: { heartRate: 150, isActive: true },
      }
    )
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockImplementation(
      ({ heartRate, durationMinutes }) => {
        // Simplified mock: calories per minute is roughly HR * 0.1
        return heartRate * 0.1 * durationMinutes
      }
    )
    act(() => {
      jest.advanceTimersByTime(5000) // 5 seconds at 150 BPM
    })
    // After 5 seconds, about 5 * (150 * 0.1 / 60) = 1.25 calories
    expect(result.current.calories).toBeCloseTo(1.25)
    rerender({ heartRate: 160, isActive: true })
    act(() => {
      jest.advanceTimersByTime(5000) // 5 seconds at 160 BPM
    })
    // After 10 seconds total, 5s at 150 and 5s at 160
    // 1.25 (from first 5s) + 5 * (160 * 0.1 / 60) = 1.25 + 1.33 = 2.58
    expect(result.current.calories).toBeCloseTo(2.58)
  })
})
