/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutState } from '@/hooks/useWorkoutState'

describe('useWorkoutState', () => {
  it('should initialize with an "idle" status', () => {
    const { result } = renderHook(() => useWorkoutState())
    expect(result.current.workoutStatus).toBe('idle')
  })

  it('should transition from "idle" to "running" when startWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')
  })

  it('should transition from "running" to "paused" when pauseWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      result.current.pauseWorkout()
    })
    expect(result.current.workoutStatus).toBe('paused')
  })

  it('should transition from "paused" to "running" when startWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      result.current.pauseWorkout()
    })
    act(() => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')
  })

  it('should transition from "running" to "idle" when endWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.workoutStatus).toBe('idle')
  })

  it('should reset to "idle" when resetWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      result.current.resetWorkout()
    })
    expect(result.current.workoutStatus).toBe('idle')
  })

  it('should transition from "paused" to "running" when connect is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      result.current.pauseWorkout()
    })
    act(() => {
      result.current.connect()
    })
    expect(result.current.workoutStatus).toBe('running')
  })

  it('should transition from "running" to "paused" when disconnect is called', () => {
    const { result } = renderHook(() => useWorkoutState())
    act(() => {
      result.current.startWorkout()
    })
    act(() => {
      result.current.disconnect()
    })
    expect(result.current.workoutStatus).toBe('paused')
  })
})
