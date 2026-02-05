/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

describe('useWorkoutSession calorie logic', () => {
  it('should initialize with zero calories burned', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 0 })
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should start with zero calories burned even if totalCalories is non-zero', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 100 })
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should capture the starting calorie count on startWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: false, totalCalories }),
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
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
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
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
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
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
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
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
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
      ({ isConnected, totalCalories }) =>
        useWorkoutSession({ isConnected, totalCalories }),
      { initialProps: { isConnected: true, totalCalories: 100 } }
    )

    act(() => {
      result.current.startWorkout()
    })
    rerender({ isConnected: true, totalCalories: 110 })
    expect(result.current.caloriesBurned).toBe(10)

    // Pause
    rerender({ isConnected: false, totalCalories: 115 })
    expect(result.current.caloriesBurned).toBe(15)

    // Resume
    rerender({ isConnected: true, totalCalories: 125 })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should pause the workout when pauseWorkout is called', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )

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

describe('useWorkoutSession session management and startTime', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with null startTime and hasStarted false', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false })
    )
    expect(result.current.startTime).toBeNull()
    expect(result.current.hasStarted).toBe(false)
  })

  it('should set startTime and hasStarted true on startWorkout', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    const now = Date.now()
    jest.setSystemTime(now)

    act(() => {
      result.current.startWorkout()
    })

    expect(result.current.startTime).toBe(now)
    expect(result.current.hasStarted).toBe(true)
    expect(result.current.workoutStatus).toBe('running')
  })

  it('should preserve startTime and data after endWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )
    const startTime = Date.now()
    jest.setSystemTime(startTime)

    act(() => {
      result.current.startWorkout()
    })

    // Advance time
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    rerender({ totalCalories: 150 })

    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.startTime).toBe(startTime)
    expect(result.current.hasStarted).toBe(true)
    expect(result.current.workoutDuration).toBeGreaterThanOrEqual(5)
  })

  it('should handle CONNECT transition correctly when paused', () => {
    const { result, rerender } = renderHook(
      ({ isConnected }) => useWorkoutSession({ isConnected }),
      { initialProps: { isConnected: true } }
    )

    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')

    // Disconnect (should pause)
    rerender({ isConnected: false })
    expect(result.current.workoutStatus).toBe('paused')

    // Reconnect
    rerender({ isConnected: true })
    expect(result.current.workoutStatus).toBe('running')
  })

  it('should resume existing workout without resetting duration or startTime', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    const startTime = Date.now()
    jest.setSystemTime(startTime)

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current.workoutDuration).toBe(5)

    act(() => {
      result.current.pauseWorkout()
    })
    expect(result.current.workoutStatus).toBe('paused')

    act(() => {
      result.current.startWorkout() // Resuming
    })

    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.startTime).toBe(startTime)
    expect(result.current.workoutDuration).toBe(5)
  })

  it('should NOT reset startCalories when resuming from paused status', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 110 })
    expect(result.current.caloriesBurned).toBe(10)

    act(() => {
      result.current.pauseWorkout()
    })
    expect(result.current.workoutStatus).toBe('paused')

    // While paused, calories increase more
    rerender({ totalCalories: 120 })
    expect(result.current.caloriesBurned).toBe(20)

    act(() => {
      result.current.startWorkout() // Resume
    })

    expect(result.current.workoutStatus).toBe('running')
    // If it bugged out, it would show 0 because it would set startCalories to 120
    expect(result.current.caloriesBurned).toBe(20)

    rerender({ totalCalories: 130 })
    expect(result.current.caloriesBurned).toBe(30)
  })

  it('should correctly account for pause duration in workoutDuration', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    const startTime = 1000000
    jest.setSystemTime(startTime)

    act(() => {
      result.current.startWorkout()
    })

    // Advance 5s
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    // Trigger a TICK
    act(() => {
      jest.runOnlyPendingTimers()
    })
    expect(result.current.workoutDuration).toBeGreaterThanOrEqual(5)

    // Pause at 10s (5s of running, 5s more passed)
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    act(() => {
      result.current.pauseWorkout()
    })
    // At this point duration should be >= 10
    expect(result.current.workoutDuration).toBeGreaterThanOrEqual(10)

    // Wait 20s while paused
    act(() => {
      jest.advanceTimersByTime(20000)
    })

    // Resume
    act(() => {
      result.current.startWorkout()
    })

    // Duration should still be >= 10 right after resume
    expect(result.current.workoutDuration).toBeGreaterThanOrEqual(10)

    // Advance 5s more
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    act(() => {
      jest.runOnlyPendingTimers()
    })
    expect(result.current.workoutDuration).toBeGreaterThanOrEqual(15)
  })

  it('should reset all state on resetWorkout', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )

    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.hasStarted).toBe(true)

    act(() => {
      result.current.resetWorkout()
    })

    expect(result.current.startTime).toBeNull()
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
  })
})
