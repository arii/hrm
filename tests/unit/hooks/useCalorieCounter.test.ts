/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { Gender } from '@/types/core'

describe('useCalorieCounter', () => {
  // Use Jest's fake timers to control setInterval
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not accumulate calories when isActive is false', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isActive }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isActive),
      {
        initialProps: { heartRate: 100, isActive: false },
      }
    )

    expect(result.current.calories).toBe(0)

    // Advance time, but calories should not change
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    rerender({ heartRate: 120, isActive: false })
    expect(result.current.calories).toBe(0)
  })

  it('should calculate and accumulate calories over time when running', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isActive }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isActive),
      {
        initialProps: { heartRate: 150, isActive: true },
      }
    )

    // Initial calories should be 0
    expect(result.current.calories).toBe(0)

    // Advance time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // After 1 second at 150bpm, calories should be > 0
    const firstValue = result.current.calories
    expect(firstValue).toBeGreaterThan(0)

    // Rerender with a new heart rate to update smoothed HR
    rerender({ heartRate: 151, isActive: true })

    // Advance time by another second
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // After another second, calories should increase
    expect(result.current.calories).toBeGreaterThan(firstValue)
  })

  it('should reset calories when resetCalories is called', () => {
    const { result } = renderHook(() =>
      useCalorieCounter(150, 30, 70, 'MALE', true)
    )

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.calories).toBeGreaterThan(0)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
    // After reset, it should not start accumulating again without new props
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current.calories).toBe(0)
  })

  it('should apply SMA to smooth heart rate', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isActive }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isActive, {
          smaWindow: 5,
        }),
      { initialProps: { heartRate: 100, isActive: true } }
    )

    // Initial HR is 100, but buffer is just [100], so smoothed is 100
    expect(result.current.smoothedHeartRate).toBe(100)

    // Add more readings
    rerender({ heartRate: 102, isActive: true })
    rerender({ heartRate: 104, isActive: true })
    rerender({ heartRate: 106, isActive: true })
    rerender({ heartRate: 108, isActive: true })

    // The smoothed value should be the average of [100, 102, 104, 106, 108] = 104
    expect(result.current.smoothedHeartRate).toBe(104)

    // Add another reading, pushing the first one out
    rerender({ heartRate: 100, isActive: true })
    // Now the window is [102, 104, 106, 108, 100], average is 104
    expect(result.current.smoothedHeartRate).toBe(104)
  })

  it('should handle different genders', () => {
    // Test male
    const { result: maleResult } = renderHook(() =>
      useCalorieCounter(150, 30, 70, 'MALE', true)
    )
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    const maleCalories = maleResult.current.calories

    // Reset timers and test female
    jest.useRealTimers()
    jest.useFakeTimers()

    const { result: femaleResult } = renderHook(() =>
      useCalorieCounter(150, 30, 70, 'FEMALE', true)
    )
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    const femaleCalories = femaleResult.current.calories

    expect(maleCalories).toBeGreaterThan(0)
    expect(femaleCalories).toBeGreaterThan(0)
    expect(maleCalories).not.toBe(femaleCalories)
    // Male formula should result in higher calorie burn
    expect(maleCalories).toBeGreaterThan(femaleCalories)
  })
})
