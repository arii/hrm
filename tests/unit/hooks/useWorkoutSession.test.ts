/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

describe('useWorkoutSession calorie logic', () => {
  let mockStorage: Record<string, string> = {}

  beforeAll(() => {
    // Mock localStorage to ensure test isolation
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => mockStorage[key] || null),
        setItem: jest.fn((key, value) => {
          mockStorage[key] = value.toString()
        }),
        removeItem: jest.fn((key) => {
          delete mockStorage[key]
        }),
        clear: jest.fn(() => {
          mockStorage = {}
        }),
      },
      writable: true,
    })
  })

  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
  })

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

  it('should capture the starting calorie count on startWorkout', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: false, totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    // Wait for rehydration mount
    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })

    await act(async () => {
      rerender({ totalCalories: 110 })
    })

    expect(result.current.caloriesBurned).toBe(10)
  })

  it('should calculate calories burned based on the difference from the start', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 50 } }
    )

    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })

    await act(async () => {
      rerender({ totalCalories: 55 })
    })
    expect(result.current.caloriesBurned).toBe(5)

    await act(async () => {
      rerender({ totalCalories: 75 })
    })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should not show negative calories if totalCalories decreases', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })

    await act(async () => {
      rerender({ totalCalories: 90 })
    })
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should preserve the last calculated calories when the workout ends', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 200 } }
    )

    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })

    await act(async () => {
      rerender({ totalCalories: 250 })
    })
    expect(result.current.caloriesBurned).toBe(50)

    await act(async () => {
      result.current.endWorkout()
    })

    expect(result.current.caloriesBurned).toBe(50)

    await act(async () => {
      rerender({ totalCalories: 260 })
    })
    expect(result.current.caloriesBurned).toBe(50)
  })

  it('should reset caloriesBurned to zero on resetWorkout', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 300 } }
    )

    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })

    await act(async () => {
      rerender({ totalCalories: 320 })
    })
    expect(result.current.caloriesBurned).toBe(20)

    await act(async () => {
      result.current.resetWorkout()
    })

    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should not be affected by pause and resume', async () => {
    const { result, rerender } = renderHook(
      ({ isConnected, totalCalories }) =>
        useWorkoutSession({ isConnected, totalCalories }),
      { initialProps: { isConnected: true, totalCalories: 100 } }
    )

    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })

    await act(async () => {
      rerender({ isConnected: true, totalCalories: 110 })
    })
    expect(result.current.caloriesBurned).toBe(10)

    // Pause
    await act(async () => {
      rerender({ isConnected: false, totalCalories: 115 })
    })
    expect(result.current.caloriesBurned).toBe(15)

    // Resume
    await act(async () => {
      rerender({ isConnected: true, totalCalories: 125 })
    })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should pause the workout when pauseWorkout is called', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: true })
    )

    await act(async () => {})

    await act(async () => {
      result.current.startWorkout()
    })
    expect(result.current.workoutStatus).toBe('running')

    await act(async () => {
      result.current.pauseWorkout()
    })
    expect(result.current.workoutStatus).toBe('paused')
  })
})
