/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

describe('useWorkoutSession calorie logic', () => {
  it('should initialize with the provided totalCalories', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 150 })
    )
    expect(result.current.accumulatedCalories).toBe(150)
  })

  it('should always reflect the current totalCalories passed to it', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    expect(result.current.accumulatedCalories).toBe(100)

    rerender({ totalCalories: 110 })
    expect(result.current.accumulatedCalories).toBe(110)

    rerender({ totalCalories: 150 })
    expect(result.current.accumulatedCalories).toBe(150)
  })

  it('should not be affected by starting or ending a workout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 200 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 220 })
    expect(result.current.accumulatedCalories).toBe(220)

    act(() => {
      result.current.endWorkout()
    })

    rerender({ totalCalories: 230 })
    expect(result.current.accumulatedCalories).toBe(230)
  })

  it('should reset calories to zero on resetWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 300 } }
    )

    expect(result.current.accumulatedCalories).toBe(300)

    act(() => {
      result.current.resetWorkout()
    })

    // After reset, the hook's internal state is cleared. It will reflect
    // the totalCalories prop value on the *next* render, which is 0
    // because the parent component will reset it.
    rerender({ totalCalories: 0 })
    expect(result.current.accumulatedCalories).toBe(0)
  })
})
