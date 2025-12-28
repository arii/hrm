/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useCalorieCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '../../../hooks/useCalorieCounter'
import * as calorieEstimation from '../../../lib/calorie-estimation'

jest.mock('../../../lib/calorie-estimation', () => ({
  estimateCaloriesPerMinute: jest.fn(),
}))

describe('useCalorieCounter', () => {
  beforeEach(() => {
    // Enable fake timers
    jest.useFakeTimers()
    ;(calorieEstimation.estimateCaloriesPerMinute as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should calculate calories correctly over time', () => {
    // Mocking a return of 60 calories per minute for simplicity (1 calorie per second)
    ;(calorieEstimation.estimateCaloriesPerMinute as jest.Mock).mockReturnValue(60)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, true))

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.calories).toBeCloseTo(1)
    expect(calorieEstimation.estimateCaloriesPerMinute).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBeCloseTo(3)
    expect(calorieEstimation.estimateCaloriesPerMinute).toHaveBeenCalledTimes(3)
  })

  it('should not calculate calories when isActive is false', () => {
    ;(calorieEstimation.estimateCaloriesPerMinute as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, false))

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.calories).toBe(0)
    expect(calorieEstimation.estimateCaloriesPerMinute).not.toHaveBeenCalled()
  })

  it('should reset calories when resetCalories is called', () => {
    ;(calorieEstimation.estimateCaloriesPerMinute as jest.Mock).mockReturnValue(60)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, true))

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBeCloseTo(2)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
  })
})
