/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useCalorieCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '../../../hooks/useCalorieCounter'

describe('useCalorieCounter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not calculate calories when isActive is false', () => {
    const { result } = renderHook(() =>
      useCalorieCounter(150, 30, 70, false)
    )
    expect(result.current.calories).toBe(0)
  })

  it('should accumulate calories over time when active', () => {
    const { result } = renderHook(() => useCalorieCounter(150, 30, 70, true))

    // Initial state should be 0 calories
    expect(result.current.calories).toBe(0)

    // Advance time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // After 5 seconds, calories should have accumulated
    expect(result.current.calories).toBeGreaterThan(0)

    const caloriesAfter5Seconds = result.current.calories

    // Advance time by another 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // Calories should have further accumulated
    expect(result.current.calories).toBeGreaterThan(caloriesAfter5Seconds)
  })

  it('should reset calories when resetCalories is called', () => {
    const { result } = renderHook(() => useCalorieCounter(150, 30, 70, true))

    // Advance time by 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBeGreaterThan(0)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
  })
})
