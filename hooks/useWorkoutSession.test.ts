import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from './useWorkoutSession'
import { BluetoothConnectionStatus } from '../../types/bluetooth'

// Mock timers
jest.useFakeTimers()

describe('useWorkoutSession', () => {
  it('should correctly handle the full workout lifecycle: start, accumulate, end, and reset', () => {
    let totalCalories = 0
    const { result, rerender } = renderHook(
      ({ bluetoothStatus, calories }) =>
        useWorkoutSession({ bluetoothStatus, totalCalories: calories }),
      {
        initialProps: {
          bluetoothStatus: BluetoothConnectionStatus.DISCONNECTED,
          calories: totalCalories,
        },
      }
    )

    // 1. Initial State
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.caloriesBurned).toBe(0)
    expect(result.current.hasStarted).toBe(false)

    // 2. Start the workout
    act(() => {
      result.current.startWorkout()
    })

    // Manually set bluetooth to connected to simulate a real session
    rerender({
      bluetoothStatus: BluetoothConnectionStatus.CONNECTED,
      calories: totalCalories,
    })

    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.hasStarted).toBe(true)

    // 3. Accumulate data over time
    act(() => {
      jest.advanceTimersByTime(5000) // 5 seconds
    })
    totalCalories = 10 // Simulate burning 10 calories
    rerender({
      bluetoothStatus: BluetoothConnectionStatus.CONNECTED,
      calories: totalCalories,
    })

    expect(result.current.workoutDuration).toBe(5)
    expect(result.current.caloriesBurned).toBe(10)

    // 4. End the workout
    act(() => {
      result.current.endWorkout()
    })

    // Assert that post-workout summary state is correct
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.caloriesBurned).toBe(10) // Calories are preserved for summary
    expect(result.current.workoutDuration).toBe(0) // Duration is reset
    expect(result.current.hasStarted).toBe(true) // Should still be true for summary view

    // 5. Reset for a new session
    act(() => {
      result.current.resetWorkout()
    })

    // Assert that the state is fully reset
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.caloriesBurned).toBe(0)
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.workoutDuration).toBe(0)
  })
})
