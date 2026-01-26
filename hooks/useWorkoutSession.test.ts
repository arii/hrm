/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from './useWorkoutSession'

describe('useWorkoutSession', () => {
  it('should correctly manage the workout lifecycle', () => {
    const { result, rerender } = renderHook(
      ({ isConnected, totalCalories }) =>
        useWorkoutSession({ isConnected, totalCalories }),
      {
        initialProps: { isConnected: false, totalCalories: 200 },
      }
    )

    // Initial state
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.caloriesBurned).toBe(0)

    // Start the workout
    act(() => {
      result.current.startWorkout()
    })
    rerender({ isConnected: true, totalCalories: 210 })

    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.hasStarted).toBe(true)
    expect(result.current.caloriesBurned).toBe(10)

    // End the workout
    act(() => {
      result.current.endWorkout()
    })
    rerender({ isConnected: false, totalCalories: 250 })

    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.hasStarted).toBe(true) // Summary should be visible
    expect(result.current.caloriesBurned).toBe(50)

    // Reset the workout
    act(() => {
      result.current.resetWorkout()
    })

    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.caloriesBurned).toBe(0)
  })
})
