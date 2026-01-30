/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useWorkoutSessionManager.test.ts

import { renderHook, act } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../hooks/useWorkoutSessionManager'
import {
  workoutSessionStorage,
  HrZoneName,
} from '../../../lib/workout-session-storage'

// Mock the storage module
jest.mock('../../../lib/workout-session-storage', () => {
  const originalModule = jest.requireActual(
    '../../../lib/workout-session-storage'
  )
  return {
    ...originalModule,
    workoutSessionStorage: {
      getIncompleteSession: jest.fn(),
      saveSession: jest.fn(),
      deleteSession: jest.fn(),
    },
  }
})

describe('useWorkoutSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize and check for incomplete sessions', async () => {
    ;(
      workoutSessionStorage.getIncompleteSession as jest.Mock
    ).mockResolvedValueOnce(null)
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isInitialized).toBe(true)
    expect(result.current.session).toBeNull()
  })

  it('should recover an incomplete session', async () => {
    const mockSession = { sessionId: 'incomplete-session', status: 'paused' }
    ;(
      workoutSessionStorage.getIncompleteSession as jest.Mock
    ).mockResolvedValueOnce(mockSession)
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.session).toEqual(mockSession)
    expect(result.current.status).toBe('paused')
  })

  it('should start a new workout', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    act(() => {
      result.current.startWorkout(30, 70)
    })
    expect(result.current.status).toBe('running')
    expect(result.current.session).not.toBeNull()
    expect(result.current.session?.sessionId).toBeDefined()
  })

  it('should pause and resume a workout', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    act(() => {
      result.current.startWorkout(30, 70)
    })
    act(() => {
      result.current.pauseWorkout()
    })
    expect(result.current.status).toBe('paused')
    act(() => {
      result.current.resumeWorkout()
    })
    expect(result.current.status).toBe('running')
  })

  it('should transition from running to paused, then to finished', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    // Start the workout
    act(() => {
      result.current.startWorkout(30, 70)
    })
    expect(result.current.status).toBe('running')

    // First call to endWorkout should pause the session
    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.status).toBe('paused')
    expect(result.current.session?.endTime).toBeNull()

    // Second call to endWorkout should finish the session
    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.status).toBe('finished')
    expect(result.current.session?.endTime).not.toBeNull()
  })

  it('should persist session changes on pause and end', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 70)
    })
    // Expect the initial save for the 'running' state
    expect(workoutSessionStorage.saveSession).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.pauseWorkout()
    })
    // Expect a save for the 'paused' state
    expect(workoutSessionStorage.saveSession).toHaveBeenCalledTimes(2)
    expect(
      (workoutSessionStorage.saveSession as jest.Mock).mock.calls[1][0].status
    ).toBe('paused')
  })

  it('should reset a workout', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    act(() => {
      result.current.startWorkout(30, 70)
    })
    await act(async () => {
      await result.current.resetWorkout()
    })
    expect(result.current.session).toBeNull()
    expect(result.current.status).toBe('idle')
    expect(workoutSessionStorage.deleteSession).toHaveBeenCalled()
  })

  it('should calculate time in zones correctly', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    const age = 30
    const maxHr = 208 - 0.7 * age // ~187
    const startTime = Date.now()

    act(() => {
      result.current.startWorkout(age, 70, maxHr)
    })

    // NoData zone - 1s
    act(() => {
      result.current.addHrData({ time: startTime, hr: 0 })
    })

    // Fat Burn zone - 2s
    act(() => {
      result.current.addHrData({ time: startTime + 1000, hr: 120 })
    })
    act(() => {
      result.current.addHrData({ time: startTime + 2000, hr: 125 })
    })

    // Cardio zone - 1s
    act(() => {
      result.current.addHrData({ time: startTime + 3000, hr: 140 })
    })

    expect(result.current.session?.timeInZones[HrZoneName.NoData]).toBeCloseTo(
      1
    )
    expect(result.current.session?.timeInZones[HrZoneName.FatBurn]).toBeCloseTo(
      2
    )
    expect(result.current.session?.timeInZones[HrZoneName.Cardio]).toBeCloseTo(
      1
    )
  })
})
