// tests/unit/hooks/useLocalWorkoutBuffer.test.ts
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useLocalWorkoutBuffer } from '@/app/client/experimental/useLocalWorkoutBuffer'
import { useUserSettings } from '@/context/UserSettingsContext'
import useLocalStorage from '@/hooks/useLocalStorage'

// Mocks
jest.mock('@/context/UserSettingsContext')
jest.mock('@/hooks/useLocalStorage')

const mockUseUserSettings = useUserSettings as jest.Mock
const mockUseLocalStorage = useLocalStorage as jest.Mock

describe('useLocalWorkoutBuffer', () => {
  let mockSetWorkoutData: jest.Mock
  let mockWorkoutData: any

  beforeEach(() => {
    mockSetWorkoutData = jest.fn()
    mockWorkoutData = {
      startTime: null,
      endTime: null,
      status: 'idle',
      hrHistory: [],
      timeInZones: {},
    }

    mockUseUserSettings.mockReturnValue([
      { userAge: 30, userWeight: 70, maxHr: 190, restingHr: 60 },
      jest.fn(),
    ])

    mockUseLocalStorage.mockImplementation((key, initialValue) => {
      // Allow the mock to be updated by tests
      if (mockWorkoutData.status === 'idle' && initialValue.status !== 'idle') {
        mockWorkoutData = initialValue
      }
      return [mockWorkoutData, mockSetWorkoutData]
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with idle status', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(0, 'idle'))
    expect(result.current.workoutData.status).toBe('idle')
  })

  it('should transition to paused when external status becomes idle from running', () => {
    // Initial state is running
    mockWorkoutData.status = 'running'
    const { rerender } = renderHook(
      ({ workoutStatus }) => useLocalWorkoutBuffer(70, workoutStatus),
      {
        initialProps: { workoutStatus: 'running' },
      }
    )

    // Transition workout status to idle
    rerender({ workoutStatus: 'idle' })

    // Expect the hook to call setWorkoutData with a function that updates status to 'paused'
    expect(mockSetWorkoutData).toHaveBeenCalled()

    // Simulate the state update
    const updater = mockSetWorkoutData.mock.calls[0][0]
    const newState = updater(mockWorkoutData)

    // Check the new state
    expect(newState.status).toBe('paused')
  })

  it('should resume the workout from a paused state', () => {
    // Initial state is paused
    mockWorkoutData.status = 'paused'
    mockWorkoutData.hrHistory = [{ time: Date.now(), hr: 120, zone: 'FatBurn' }]

    const { rerender } = renderHook(
      ({ workoutStatus }) => useLocalWorkoutBuffer(75, workoutStatus),
      {
        initialProps: { workoutStatus: 'idle' },
      }
    )

    // Transition workout status to running
    rerender({ workoutStatus: 'running' })

    // Expect the hook to call setWorkoutData to resume the workout
    expect(mockSetWorkoutData).toHaveBeenCalled()

    // Simulate the state update
    const updater = mockSet-workoutData.mock.calls[0][0]
    const newState = updater(mockWorkoutData)

    // Check that the status is running and data is not reset
    expect(newState.status).toBe('running')
    expect(newState.hrHistory.length).toBe(1)
  })
})
