/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useCalorieCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '../../../hooks/useCalorieCounter'
import * as calorieEstimation from '../../../lib/calorie-estimation'
import { Gender } from '../../../types'

jest.mock('../../../lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

describe('useCalorieCounter', () => {
  beforeEach(() => {
    // Enable fake timers
    jest.useFakeTimers()
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockClear()
    // Set a default mock return value for all tests in this suite
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should calculate calories correctly over time', () => {
    const { result } = renderHook(() =>
      useCalorieCounter(120, 30, 70, 'MALE', true)
    )

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
    const { result } = renderHook(() =>
      useCalorieCounter(120, 30, 70, 'MALE', false)
    )

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.calories).toBe(0)
    expect(calorieEstimation.estimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should reset calories when resetCalories is called', () => {
    const { result } = renderHook(() =>
      useCalorieCounter(120, 30, 70, 'MALE', true)
    )

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBe(2)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
  })
})
