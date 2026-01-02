/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'

// Mock Date.now() to control time in tests
let time: number

beforeEach(() => {
  time = Date.now()
  jest.spyOn(Date, 'now').mockImplementation(() => time)
})

afterEach(() => {
  jest.restoreAllMocks()
})

const advanceTime = (seconds: number) => {
  time += seconds * 1000
}

describe('useCalorieCounter', () => {
  it('should not accumulate calories when not running', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isRunning }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isRunning),
      {
        initialProps: { heartRate: 100, isRunning: false },
      }
    )

    expect(result.current.calories).toBe(0)
    act(() => advanceTime(10))
    rerender({ heartRate: 120, isRunning: false })
    expect(result.current.calories).toBe(0)
  })

  it('should calculate and accumulate calories over time when running', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isRunning }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isRunning),
      {
        initialProps: { heartRate: 100, isRunning: true },
      }
    )

    act(() => {
      advanceTime(1)
      rerender({ heartRate: 150, isRunning: true })
    })

    // After 1 second at 150bpm, calories should be > 0
    const firstValue = result.current.calories
    expect(firstValue).toBeGreaterThan(0)

    act(() => {
      advanceTime(1)
      // Rerender with a slightly different HR to trigger the effect
      rerender({ heartRate: 151, isRunning: true })
    })

    // After another second, calories should increase
    expect(result.current.calories).toBeGreaterThan(firstValue)
  })

  it('should reset calories when resetCalories is called', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isRunning }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isRunning),
      {
        initialProps: { heartRate: 150, isRunning: true },
      }
    )

    act(() => {
      advanceTime(5)
      // Rerender with a slightly different HR to trigger the effect
      rerender({ heartRate: 151, isRunning: true })
    })

    expect(result.current.calories).toBeGreaterThan(0)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
  })

  it('should apply SMA to smooth heart rate', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, isRunning }) =>
        useCalorieCounter(heartRate, 30, 70, 'MALE', isRunning, {
          smaWindow: 5,
        }),
      { initialProps: { heartRate: 100, isRunning: true } }
    )

    // Initial HR is 100
    expect(result.current.smoothedHeartRate).toBe(100)

    // Add more readings
    rerender({ heartRate: 102, isRunning: true })
    rerender({ heartRate: 104, isRunning: true })
    rerender({ heartRate: 106, isRunning: true })
    rerender({ heartRate: 108, isRunning: true })

    // The smoothed value should be the average of [100, 102, 104, 106, 108] = 104
    expect(result.current.smoothedHeartRate).toBe(104)

    // Add another reading, pushing the first one out
    rerender({ heartRate: 100, isRunning: true })
    // Now the window is [102, 104, 106, 108, 100], average is 104
    expect(result.current.smoothedHeartRate).toBe(104)
  })

  it('should handle different genders', () => {
    const testInitialTime = time // Capture time from beforeEach

    const { result: maleResult, rerender: rerenderMale } = renderHook(
      ({ heartRate, isRunning, gender }) =>
        useCalorieCounter(heartRate, 30, 70, gender, isRunning),
      {
        initialProps: { heartRate: 150, isRunning: true, gender: 'MALE' },
      }
    )
    act(() => {
      advanceTime(10)
      rerenderMale({ heartRate: 151, isRunning: true, gender: 'MALE' })
    })

    // Reset time for the next independent calculation
    time = testInitialTime

    const { result: femaleResult, rerender: rerenderFemale } = renderHook(
      ({ heartRate, isRunning, gender }) =>
        useCalorieCounter(heartRate, 30, 70, gender, isRunning),
      {
        initialProps: { heartRate: 150, isRunning: true, gender: 'FEMALE' },
      }
    )
    act(() => {
      advanceTime(10)
      rerenderFemale({ heartRate: 151, isRunning: true, gender: 'FEMALE' })
    })

    expect(maleResult.current.calories).not.toBe(femaleResult.current.calories)
    // Male formula should result in higher calorie burn
    expect(maleResult.current.calories).toBeGreaterThan(
      femaleResult.current.calories
    )
  })
})
