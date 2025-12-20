/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

// Mock the useLocalStorage hook
jest.mock('@/hooks/useLocalStorage', () => {
  const original = jest.requireActual('@/hooks/useLocalStorage')
  return {
    ...original,
    __esModule: true,
    default: jest.fn(),
  }
})

import useLocalStorage from '@/hooks/useLocalStorage'

const mockUseLocalStorage = useLocalStorage as jest.Mock

describe('useWorkoutSession calorie logic', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseLocalStorage.mockImplementation(() => [0, jest.fn()])
  })

  it('should initialize with the provided totalCalories', () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 150 })
    )
    expect(result.current.accumulatedCalories).toBe(150)
  })

  it('should always reflect the current totalCalories passed to it', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 100 } }
    )

    expect(result.current.accumulatedCalories).toBe(100)

    rerender({ totalCalories: 110 })
    expect(result.current.accumulatedCalories).toBe(110)

    rerender({ totalCalories: 150 })
    expect(result.current.accumulatedCalories).toBe(150)
  })

  it('should not be affected by starting or ending a workout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 200 } }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 220 })
    expect(result.current.accumulatedCalories).toBe(220)

    act(() => {
      result.current.endWorkout()
    })

    rerender({ totalCalories: 230 })
    expect(result.current.accumulatedCalories).toBe(230)
  })

  it('should preserve calories on resetWorkout', () => {
    const setPersistedCalories = jest.fn()
    mockUseLocalStorage.mockImplementation(() => [300, setPersistedCalories])

    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      { initialProps: { totalCalories: 300 } }
    )

    expect(result.current.accumulatedCalories).toBe(300)

    act(() => {
      result.current.resetWorkout()
    })

    // After reset, the calorie count should be preserved from the persisted value.
    expect(result.current.accumulatedCalories).toBe(300)

    // It should not change even on re-render if totalCalories is 0.
    rerender({ totalCalories: 0 })
    expect(result.current.accumulatedCalories).toBe(0)
  })
})
