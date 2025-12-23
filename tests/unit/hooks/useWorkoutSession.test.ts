/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

// Mock the global fetch function
beforeEach(() => {
  global.fetch = jest.fn((url, _options) => {
    if (url.toString().endsWith('/api/workouts')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'mock-session-id',
            userId: MOCK_USER_ID,
            startedAt: new Date().toISOString(),
            endedAt: null,
            notes: 'New workout session',
          }),
      })
    }
    if (url.toString().includes('/api/workouts/')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'mock-session-id',
            userId: MOCK_USER_ID,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            notes: 'New workout session',
          }),
      })
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not Found' }),
    })
  }) as jest.Mock
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useWorkoutSession calorie logic', () => {
  it('should initialize with zero calories burned', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        isConnected: false,
        totalCalories: 0,
        userId: MOCK_USER_ID,
      })
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should start with zero calories burned even if totalCalories is non-zero', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({
        isConnected: false,
        totalCalories: 100,
        userId: MOCK_USER_ID,
      })
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should capture the starting calorie count on startWorkout', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({
          isConnected: false,
          totalCalories,
          userId: MOCK_USER_ID,
        }),
      { initialProps: { totalCalories: 100 } }
    )

    await act(async () => {
      await result.current.startWorkout()
    })

    rerender({ totalCalories: 110 })
    expect(result.current.caloriesBurned).toBe(10)
  })

  it('should calculate calories burned based on the difference from the start', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({
          isConnected: true,
          totalCalories,
          userId: MOCK_USER_ID,
        }),
      { initialProps: { totalCalories: 50 } }
    )

    await act(async () => {
      await result.current.startWorkout()
    })

    rerender({ totalCalories: 55 })
    expect(result.current.caloriesBurned).toBe(5)

    rerender({ totalCalories: 75 })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should not show negative calories if totalCalories decreases', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({
          isConnected: true,
          totalCalories,
          userId: MOCK_USER_ID,
        }),
      { initialProps: { totalCalories: 100 } }
    )

    await act(async () => {
      await result.current.startWorkout()
    })

    rerender({ totalCalories: 90 }) // totalCalories decreased
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should preserve the last calculated calories when the workout ends', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({
          isConnected: true,
          totalCalories,
          userId: MOCK_USER_ID,
        }),
      { initialProps: { totalCalories: 200 } }
    )

    await act(async () => {
      await result.current.startWorkout()
    })

    rerender({ totalCalories: 250 })
    expect(result.current.caloriesBurned).toBe(50)

    await act(async () => {
      await result.current.endWorkout()
    })

    expect(result.current.caloriesBurned).toBe(50)
    rerender({ totalCalories: 260 }) // Further changes should not affect burned calories
    expect(result.current.caloriesBurned).toBe(50)
  })

  it('should reset caloriesBurned to zero on resetWorkout', async () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({
          isConnected: true,
          totalCalories,
          userId: MOCK_USER_ID,
        }),
      { initialProps: { totalCalories: 300 } }
    )

    await act(async () => {
      await result.current.startWorkout()
    })

    rerender({ totalCalories: 320 })
    expect(result.current.caloriesBurned).toBe(20)

    act(() => {
      result.current.resetWorkout()
    })

    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should not be affected by pause and resume', async () => {
    const { result, rerender } = renderHook(
      ({ isConnected, totalCalories }) =>
        useWorkoutSession({
          isConnected,
          totalCalories,
          userId: MOCK_USER_ID,
        }),
      { initialProps: { isConnected: true, totalCalories: 100 } }
    )

    await act(async () => {
      await result.current.startWorkout()
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
})
