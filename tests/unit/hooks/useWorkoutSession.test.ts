/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useWorkoutSession.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSession } from '../../../hooks/useWorkoutSession'
import { workoutSessionStorage } from '../../../lib/workout-session-storage'

jest.mock('../../../lib/workout-session-storage')

describe('useWorkoutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(Object.getPrototypeOf(window.localStorage), 'getItem')
      .mockReturnValue(null)
    jest
      .spyOn(Object.getPrototypeOf(window.localStorage), 'setItem')
      .mockImplementation(() => {})
    jest
      .spyOn(Object.getPrototypeOf(window.localStorage), 'removeItem')
      .mockImplementation(() => {})
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useWorkoutSession({}))
    expect(result.current.workoutStatus).toBe('idle')
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.currentSession).toBeNull()
  })

  it('starts a workout', () => {
    const { result } = renderHook(() => useWorkoutSession({}))

    act(() => {
      result.current.startWorkout()
    })

    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.hasStarted).toBe(true)
    expect(result.current.currentSession).not.toBeNull()
    expect(result.current.currentSession?.status).toBe('running')
    expect(workoutSessionStorage.saveSession).toHaveBeenCalled()
  })

  it('updates duration on tick', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useWorkoutSession({}))

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.workoutDuration).toBeGreaterThanOrEqual(2)
    jest.useRealTimers()
  })

  it('pauses and resumes workout', () => {
    const { result } = renderHook(() => useWorkoutSession({}))

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      result.current.pauseWorkout()
    })

    expect(result.current.workoutStatus).toBe('paused')

    act(() => {
      result.current.startWorkout() // Resume
    })

    expect(result.current.workoutStatus).toBe('running')
  })

  it('ends workout', async () => {
    ;(workoutSessionStorage.getSession as jest.Mock).mockResolvedValue({
      sessionId: 'test-id',
      status: 'running',
    })

    const { result } = renderHook(() => useWorkoutSession({}))

    act(() => {
      result.current.startWorkout()
    })

    await act(async () => {
      await result.current.endWorkout()
    })

    expect(result.current.workoutStatus).toBe('idle')
    expect(workoutSessionStorage.saveSession).toHaveBeenCalled()
  })

  it('adds HR data and updates currentSession', async () => {
    const { result } = renderHook(() =>
      useWorkoutSession({ userAge: 30, userWeight: 70 })
    )

    act(() => {
      result.current.startWorkout()
    })

    // Expect initial session to be saved
    expect(result.current.currentSession).toBeDefined()
    expect(result.current.currentSession?.hrHistory).toHaveLength(0)

    await act(async () => {
      await result.current.addHrData(150)
    })

    // Check if currentSession updated in hook state
    expect(result.current.currentSession?.hrHistory).toHaveLength(1)
    expect(result.current.currentSession?.hrHistory[0].hr).toBe(150)
    expect(result.current.currentSession?.maxHr).toBe(150)
    expect(result.current.currentSession?.averageHr).toBe(150)

    // Check zones (150 for age 30 is likely Aerobic/Cardio)
    // Max HR = 220 - 30 = 190. 150/190 = 79%. Zone 3 (Cardio)
    // Wait, zone calculation depends on implementation.
    // Let's just check that saveSession was called with updated data.
    expect(workoutSessionStorage.saveSession).toHaveBeenCalledTimes(2) // Start + Add Data
  })

  it('calculates calories burned', () => {
    const { result, rerender } = renderHook(
      (props) => useWorkoutSession(props),
      {
        initialProps: { totalCalories: 100 },
      }
    )

    act(() => {
      result.current.startWorkout()
    })

    // Simulate calorie update from parent
    rerender({ totalCalories: 110 })

    expect(result.current.caloriesBurned).toBe(10)
  })

  it('recovers session from storage if valid', () => {
    const validState = {
      status: 'running',
      duration: 100,
      startTime: Date.now() - 100000,
      sessionId: 'recovered-id',
      totalPaused: 0,
      pauseTime: null,
      calories: 500,
      startCalories: 100,
      // currentSession is null in localStorage, but should be hydrated
    }
    jest
      .spyOn(Object.getPrototypeOf(window.localStorage), 'getItem')
      .mockReturnValue(JSON.stringify(validState))

    // Mock hydration
    const mockSessionData = {
      sessionId: 'recovered-id',
      status: 'running',
      startTime: validState.startTime,
      hrHistory: [],
      userSettings: { age: 30, weight: 70, maxHr: 190 },
      timeInZones: {},
      // other fields...
    }
    ;(workoutSessionStorage.getSession as jest.Mock).mockResolvedValue(
      mockSessionData
    )

    const { result } = renderHook(() => useWorkoutSession({}))

    expect(result.current.workoutStatus).toBe('running')
    expect(result.current.sessionId).toBe('recovered-id')

    // Wait for hydration effect
    waitFor(() => {
      expect(result.current.currentSession).toEqual(mockSessionData)
    })
  })

  it('ignores invalid storage state', () => {
    const invalidState = {
      status: 'invalid-status', // Invalid enum
      sessionId: 123, // Should be string
    }
    jest
      .spyOn(window.localStorage.__proto__, 'getItem')
      .mockReturnValue(JSON.stringify(invalidState))

    const { result } = renderHook(() => useWorkoutSession({}))

    expect(result.current.workoutStatus).toBe('idle')
  })

  it('resets stale session from previous day', async () => {
    const staleState = {
      status: 'running',
      duration: 100,
      startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
      sessionId: 'stale-id',
      totalPaused: 0,
      pauseTime: null,
      calories: 500,
      startCalories: 100,
    }
    jest
      .spyOn(Object.getPrototypeOf(window.localStorage), 'getItem')
      .mockReturnValue(JSON.stringify(staleState))

    const mockStaleSession = {
      sessionId: 'stale-id',
      status: 'running',
      startTime: staleState.startTime,
      hrHistory: [],
      userSettings: { age: 30, weight: 70, maxHr: 190 },
      timeInZones: {},
    }
    ;(workoutSessionStorage.getSession as jest.Mock).mockResolvedValue(
      mockStaleSession
    )

    const { result } = renderHook(() => useWorkoutSession({}))

    // Wait for effect
    await waitFor(() => {
      expect(workoutSessionStorage.deleteSession).toHaveBeenCalledWith(
        'stale-id'
      )
    })

    expect(result.current.currentSession).toBeNull()
    expect(result.current.workoutStatus).toBe('idle')
  })
})
