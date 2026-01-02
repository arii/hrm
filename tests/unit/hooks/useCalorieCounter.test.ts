/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'

// Mock the calorie estimation formula to have a predictable output
jest.mock('@/lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(
    ({
      heartRate,
      durationMinutes,
    }: {
      heartRate: number
      durationMinutes: number
    }) => {
      // Simple formula for testing: calories = (HR * 0.1) * duration_in_seconds
      // This makes it easy to verify the accumulation logic.
      const durationSeconds = durationMinutes * 60
      return heartRate * 0.1 * durationSeconds
    }
  ),
}))

describe('useCalorieCounter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Clear mock history before each test
    ;(
      require('@/lib/calorie-estimation')
        .estimateCaloriesBurned as jest.Mock
    ).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not accumulate calories when isActive is false', () => {
    const { result } = renderHook(() =>
      useCalorieCounter(150, 30, 70, false)
    )
    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(5000) // 5 seconds
    })

    expect(result.current.calories).toBe(0)
    expect(result.current.smoothedHeartRate).toBe(0)
  })

  it('should accumulate calories when isActive is true', () => {
    const { result } = renderHook(() => useCalorieCounter(150, 30, 70, true))

    act(() => {
      jest.advanceTimersByTime(5000) // 5 seconds
    })

    // After 5s, 5 ticks should have occurred. Smoothed HR will ramp up.
    // Tick 1: avg(150) = 150
    // Tick 2: avg(150,150) = 150
    // ...
    // Tick 5: avg(150,150,150,150,150) = 150
    // So for 5 seconds, the HR is consistently 150.
    // Calories per second = 150 * 0.1 = 15. Total = 15 * 5 = 75
    expect(result.current.calories).toBeCloseTo(75)
    expect(result.current.smoothedHeartRate).toBe(150)
  })

  it('should reset calories and smoothed HR when resetCalories is called', () => {
    const { result } = renderHook(() => useCalorieCounter(150, 30, 70, true))

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBeGreaterThan(0)
    expect(result.current.smoothedHeartRate).toBeGreaterThan(0)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
    expect(result.current.smoothedHeartRate).toBe(0)
  })

  it('should accumulate calories correctly with changing HR', () => {
    const { result, rerender } = renderHook(
      ({ heartRate, age, weight, isActive }) =>
        useCalorieCounter(heartRate, age, weight, isActive),
      {
        initialProps: { heartRate: 150, age: 30, weight: 70, isActive: true },
      }
    )

    // 5 seconds at 150 BPM
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // Expected after 5s: 5 ticks * (150 * 0.1) = 75
    expect(result.current.calories).toBeCloseTo(75)
    expect(result.current.smoothedHeartRate).toBe(150)

    // Change HR to 160
    rerender({ heartRate: 160, age: 30, weight: 70, isActive: true })

    // 5 more seconds
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // During the next 5s, the smoothed HR will be:
    // Tick 6: avg(150,150,150,150,160) = 152. Calories = 15.2
    // Tick 7: avg(150,150,150,160,160) = 154. Calories = 15.4
    // Tick 8: avg(150,150,160,160,160) = 156. Calories = 15.6
    // Tick 9: avg(150,160,160,160,160) = 158. Calories = 15.8
    // Tick 10: avg(160,160,160,160,160) = 160. Calories = 16.0
    // Total for these 5s = 15.2 + 15.4 + 15.6 + 15.8 + 16.0 = 78
    // Grand total = 75 + 78 = 153
    expect(result.current.calories).toBeCloseTo(153)
    expect(result.current.smoothedHeartRate).toBe(160)
  })

  it('should correctly calculate smoothed heart rate', () => {
    const { result, rerender } = renderHook(
      ({ heartRate }) => useCalorieCounter(heartRate, 30, 70, true),
      { initialProps: { heartRate: 150 } }
    );

    // Initial render, HR is 150. Smoothed HR should be 150 after the first tick.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.smoothedHeartRate).toBe(150);

    // Rerender with a new HR value
    rerender({ heartRate: 160 });

    // After another tick, the smoothed HR should be the average of [150, 160]
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.smoothedHeartRate).toBe(155);
  });
})
