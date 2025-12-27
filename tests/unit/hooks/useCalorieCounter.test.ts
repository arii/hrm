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
    jest.useFakeTimers()
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

    expect(result.current.calories).toBe(1)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBe(3)
  })

  it('should not calculate calories when isActive is false', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70, false))

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.calories).toBe(0)
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
})
