/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

describe('useWorkoutSession calorie logic', () => {
  it('should initialize with zero calories burned', () => {
    const { result } = renderHook(() => useWorkoutSession({ totalCalories: 0 }))
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should start with zero calories burned even if totalCalories is non-zero', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ totalCalories: 100 })
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should capture the starting calorie count on startWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) => useWorkoutSession({ totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 110 })
    expect(result.current.caloriesBurned).toBe(10)
  })

  it('should calculate calories burned based on the difference from the start', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) => useWorkoutSession({ totalCalories }),
      { initialProps: { totalCalories: 50 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 55 })
    expect(result.current.caloriesBurned).toBe(5)

    rerender({ totalCalories: 75 })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should not show negative calories if totalCalories decreases', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) => useWorkoutSession({ totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 90 }) // totalCalories decreased
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should preserve the last calculated calories when the workout ends', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) => useWorkoutSession({ totalCalories }),
      { initialProps: { totalCalories: 200 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 250 })
    expect(result.current.caloriesBurned).toBe(50)

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.caloriesBurned).toBe(50)
    rerender({ totalCalories: 260 }) // Further changes should not affect burned calories
    expect(result.current.caloriesBurned).toBe(50)
  })

  it('should reset caloriesBurned to zero on resetWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) => useWorkoutSession({ totalCalories }),
      { initialProps: { totalCalories: 300 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 320 })
    expect(result.current.caloriesBurned).toBe(20)

    act(() => {
      result.current.resetWorkout()
    })

    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should not be affected by pause and resume', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) => useWorkoutSession({ totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    act(() => {
      result.current.startWorkout()
    })
    rerender({ totalCalories: 110 })
    expect(result.current.caloriesBurned).toBe(10)

    // Pause
    act(() => {
      result.current.pauseWorkout()
    })
    rerender({ totalCalories: 115 })
    expect(result.current.caloriesBurned).toBe(15)

    // Resume
    act(() => {
      result.current.startWorkout() // resume
    })
    rerender({ totalCalories: 125 })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should pause the workout when pauseWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutSession())

    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')

    act(() => {
      result.current.pauseWorkout()
    })
    expect(result.current.workoutStatus).toBe('paused')
  })
})
