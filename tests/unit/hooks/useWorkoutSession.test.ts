/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

describe('useWorkoutSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with idle status and zero duration', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false })
    )
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.hasStarted).toBe(false)
  })

  it('should transition to running when startWorkout is called', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.hasStarted).toBe(true)
  })

  it('should increment duration every second when running', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(result.current.workoutDuration).toBe(1)

    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(result.current.workoutDuration).toBe(5)
  })

  it('should pause when the device disconnects and resume on reconnect', () => {
    const { result, rerender } = renderHook(
      ({ isConnected }) => useWorkoutSession({ isConnected }),
      { initialProps: { isConnected: true } }
    )

    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')

    rerender({ isConnected: false })
    expect(result.current.workoutStatus).toBe('paused')

    rerender({ isConnected: true })
    expect(result.current.workoutStatus).toBe('running')
  })

  it('should not count duration while paused', () => {
    const { result, rerender } = renderHook(
      ({ isConnected }) => useWorkoutSession({ isConnected }),
      { initialProps: { isConnected: true } }
    )

    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current.workoutDuration).toBe(2)

    rerender({ isConnected: false })
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(result.current.workoutDuration).toBe(2)

    rerender({ isConnected: true })
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current.workoutDuration).toBe(4)
  })

  it('should transition to idle and reset duration on endWorkout', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    expect(result.current.workoutDuration).toBe(10)

    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
    // hasStarted should be true to show the summary
    expect(result.current.hasStarted).toBe(true)
  })

  it('should reset the entire state on resetWorkout', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    act(() => {
      result.current.resetWorkout()
    })
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.hasStarted).toBe(false)
  })
})
