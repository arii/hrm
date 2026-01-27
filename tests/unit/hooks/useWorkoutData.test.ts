/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutData } from '@/hooks/useWorkoutData'

describe('useWorkoutData', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with 0 duration and calories', () => {
    const { result } = renderHook(() =>
      useWorkoutData({ workoutStatus: 'idle' })
    )
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should calculate duration when the workout is running', () => {
    const { result, rerender } = renderHook(
      ({ workoutStatus }) => useWorkoutData({ workoutStatus }),
      {
        initialProps: { workoutStatus: 'idle' },
      }
    )

    rerender({ workoutStatus: 'running' })

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.workoutDuration).toBe(5)
  })

  it('should pause duration calculation when the workout is paused', () => {
    const { result, rerender } = renderHook(
      ({ workoutStatus }) => useWorkoutData({ workoutStatus }),
      {
        initialProps: { workoutStatus: 'idle' },
      }
    )

    rerender({ workoutStatus: 'running' })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    rerender({ workoutStatus: 'paused' })

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.workoutDuration).toBe(3)
  })

  it('should calculate calories burned during the session', () => {
    const { result, rerender } = renderHook(
      ({ workoutStatus, totalCalories }) =>
        useWorkoutData({ workoutStatus, totalCalories }),
      {
        initialProps: { workoutStatus: 'idle', totalCalories: 100 },
      }
    )

    act(() => {
      result.current.startWorkoutData()
    })

    rerender({ workoutStatus: 'running', totalCalories: 150 })

    expect(result.current.caloriesBurned).toBe(50)
  })

  it('should reset data when resetWorkoutData is called', () => {
    const { result, rerender } = renderHook(
      ({ workoutStatus, totalCalories }) =>
        useWorkoutData({ workoutStatus, totalCalories }),
      {
        initialProps: { workoutStatus: 'idle', totalCalories: 100 },
      }
    )

    act(() => {
      result.current.startWorkoutData()
    })

    rerender({ workoutStatus: 'running', totalCalories: 150 })

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    act(() => {
      result.current.resetWorkoutData()
    })

    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.caloriesBurned).toBe(0)
  })
})
