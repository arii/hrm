import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from './useWorkoutSession'

describe('useWorkoutSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should handle a full workout lifecycle', () => {
    const { result, rerender } = renderHook(
      ({ isConnected, totalCalories }) =>
        useWorkoutSession({ isConnected, totalCalories }),
      {
        initialProps: { isConnected: false, totalCalories: 100 },
      }
    )

    // 1. Initial state
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.caloriesBurned).toBe(0)
    expect(result.current.workoutDuration).toBe(0)

    // 2. Start the workout
    act(() => {
      result.current.startWorkout()
    })

    rerender({ isConnected: true, totalCalories: 100 })

    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.hasStarted).toBe(true)

    // 3. Time passes, calories are burned
    act(() => {
      jest.advanceTimersByTime(5000) // 5 seconds
    })
    rerender({ isConnected: true, totalCalories: 150 })

    expect(result.current.workoutDuration).toBe(5)
    expect(result.current.caloriesBurned).toBe(50)

    // 4. End the workout
    act(() => {
      result.current.endWorkout()
    })
    rerender({ isConnected: false, totalCalories: 150 })

    // Workout is over, but summary data should be preserved
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.hasStarted).toBe(true)
    expect(result.current.caloriesBurned).toBe(50)
    expect(result.current.workoutDuration).toBe(0) // Duration resets

    // 5. Reset for a new workout
    act(() => {
      result.current.resetWorkout()
    })

    // Everything should be back to the initial state
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.caloriesBurned).toBe(0)
    expect(result.current.workoutDuration).toBe(0)
  })
})
