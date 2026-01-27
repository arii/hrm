/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useWorkoutState } from '@/hooks/useWorkoutState'
import { useWorkoutData } from '@/hooks/useWorkoutData'

jest.mock('@/hooks/useWorkoutState')
jest.mock('@/hooks/useWorkoutData')

const useWorkoutStateMock = useWorkoutState as jest.Mock
const useWorkoutDataMock = useWorkoutData as jest.Mock

describe('useWorkoutSession', () => {
  beforeEach(() => {
    // Reset mocks before each test
    useWorkoutStateMock.mockClear()
    useWorkoutDataMock.mockClear()
  })
  it('should return the correct initial values', () => {
    useWorkoutStateMock.mockReturnValue({
      workoutStatus: 'idle',
      startWorkout: jest.fn(),
      pauseWorkout: jest.fn(),
      endWorkout: jest.fn(),
      resetWorkout: jest.fn(),
    })
    useWorkoutDataMock.mockReturnValue({
      workoutDuration: 0,
      caloriesBurned: 0,
      resetWorkoutData: jest.fn(),
      startWorkoutData: jest.fn(),
    })

    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 0 })
    )

    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.caloriesBurned).toBe(0)
    expect(result.current.hasStarted).toBe(false)
  })

  it('should call the correct functions when startWorkout is called', () => {
    const startState = jest.fn()
    const startWorkoutData = jest.fn()
    useWorkoutStateMock.mockReturnValue({
      workoutStatus: 'idle',
      startWorkout: startState,
      pauseWorkout: jest.fn(),
      endWorkout: jest.fn(),
      resetWorkout: jest.fn(),
    })
    useWorkoutDataMock.mockReturnValue({
      workoutDuration: 0,
      caloriesBurned: 0,
      resetWorkoutData: jest.fn(),
      startWorkoutData,
    })

    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 0 })
    )

    act(() => {
      result.current.startWorkout()
    })

    expect(startState).toHaveBeenCalled()
    expect(startWorkoutData).toHaveBeenCalled()
  })

  it('should call the correct functions when pauseWorkout is called', () => {
    const pauseState = jest.fn()
    useWorkoutStateMock.mockReturnValue({
      workoutStatus: 'running',
      startWorkout: jest.fn(),
      pauseWorkout: pauseState,
      endWorkout: jest.fn(),
      resetWorkout: jest.fn(),
    })
    useWorkoutDataMock.mockReturnValue({
      workoutDuration: 10,
      caloriesBurned: 5,
      resetWorkoutData: jest.fn(),
      startWorkoutData: jest.fn(),
    })

    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 0 })
    )

    act(() => {
      result.current.pauseWorkout()
    })

    expect(pauseState).toHaveBeenCalled()
  })

  it('should call the correct functions when endWorkout is called', () => {
    const endState = jest.fn()
    useWorkoutStateMock.mockReturnValue({
      workoutStatus: 'running',
      startWorkout: jest.fn(),
      pauseWorkout: jest.fn(),
      endWorkout: endState,
      resetWorkout: jest.fn(),
    })
    useWorkoutDataMock.mockReturnValue({
      workoutDuration: 10,
      caloriesBurned: 5,
      resetWorkoutData: jest.fn(),
      startWorkoutData: jest.fn(),
    })

    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 0 })
    )

    act(() => {
      result.current.endWorkout()
    })

    expect(endState).toHaveBeenCalled()
  })

  it('should call the correct functions when resetWorkout is called', () => {
    const resetState = jest.fn()
    const resetWorkoutData = jest.fn()
    useWorkoutStateMock.mockReturnValue({
      workoutStatus: 'idle',
      startWorkout: jest.fn(),
      pauseWorkout: jest.fn(),
      endWorkout: jest.fn(),
      resetWorkout: resetState,
    })
    useWorkoutDataMock.mockReturnValue({
      workoutDuration: 0,
      caloriesBurned: 0,
      resetWorkoutData,
      startWorkoutData: jest.fn(),
    })

    const { result } = renderHook(() =>
      useWorkoutSession({ isConnected: false, totalCalories: 0 })
    )

    act(() => {
      result.current.resetWorkout()
    })

    expect(resetState).toHaveBeenCalled()
    expect(resetWorkoutData).toHaveBeenCalled()
  })
})
