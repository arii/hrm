/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { workoutSessionStorage } from '@/lib/workout-session-storage'

// Mock the storage module
jest.mock('@/lib/workout-session-storage', () => ({
  workoutSessionStorage: {
    saveSession: jest.fn().mockResolvedValue(undefined),
    appendHrData: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue({
      sessionId: 'test-session-id',
      status: 'running',
      hrHistory: [],
      timeInZones: {},
      maxHr: 0,
      averageHr: 0,
      userSettings: { maxHr: 190 },
    }),
    deleteSession: jest.fn().mockResolvedValue(undefined),
  },
  HrZoneName: {
    Rest: 'Rest',
    WarmUp: 'WarmUp',
    FatBurn: 'FatBurn',
    Cardio: 'Cardio',
    Peak: 'Peak',
  },
}))

describe('useWorkoutSession', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Calorie Logic', () => {
    it('should initialize with zero calories burned', () => {
      const { result } = renderHook(() =>
        useWorkoutSession({ totalCalories: 0 })
      )
      expect(result.current.caloriesBurned).toBe(0)
    })

    it('should capture the starting calorie count on startWorkout', () => {
      const { result, rerender } = renderHook(
        ({ totalCalories }) => useWorkoutSession({ totalCalories }),
        { initialProps: { totalCalories: 100 } }
      )

      act(() => {
        result.current.startWorkout()
      })

      rerender({ totalCalories: 110 })
      expect(result.current.caloriesBurned).toBe(10)
    })

    it('should preserve the last calculated calories when the workout ends', async () => {
      const { result, rerender } = renderHook(
        ({ totalCalories }) => useWorkoutSession({ totalCalories }),
        { initialProps: { totalCalories: 200 } }
      )

      act(() => {
        result.current.startWorkout()
      })

      rerender({ totalCalories: 250 })
      expect(result.current.caloriesBurned).toBe(50)

      await act(async () => {
        await result.current.endWorkout()
      })

      expect(result.current.caloriesBurned).toBe(50)
    })
  })

  describe('Persistence & Buffering', () => {
    it('should NOT save session to IndexedDB immediately on adding HR data', () => {
      const { result } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })
      // Clear the initial saveSession call from startWorkout
      jest.mocked(workoutSessionStorage.saveSession).mockClear()

      act(() => {
        result.current.addHrData(120)
      })

      expect(workoutSessionStorage.saveSession).not.toHaveBeenCalled()
      expect(workoutSessionStorage.appendHrData).not.toHaveBeenCalled()
    })

    it('should flush buffered data to IndexedDB after 30 seconds', async () => {
      const { result } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })
      jest.mocked(workoutSessionStorage.saveSession).mockClear()

      act(() => {
        result.current.addHrData(120)
        result.current.addHrData(125)
      })

      expect(workoutSessionStorage.saveSession).not.toHaveBeenCalled()
      expect(workoutSessionStorage.appendHrData).not.toHaveBeenCalled()

      // Fast-forward time by 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000)
      })

      // We expect appendHrData to have been called now
      expect(workoutSessionStorage.appendHrData).toHaveBeenCalledTimes(1)
      const [_, buffer] = jest.mocked(workoutSessionStorage.appendHrData).mock
        .calls[0]
      // Check that the buffer contains the added points
      expect(buffer).toHaveLength(2)
      expect(buffer[0].hr).toBe(120)
      expect(buffer[1].hr).toBe(125)
    })

    it('should flush buffered data when pausing the workout', async () => {
      const { result } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })
      jest.mocked(workoutSessionStorage.saveSession).mockClear()

      act(() => {
        result.current.addHrData(130)
      })
      expect(workoutSessionStorage.appendHrData).not.toHaveBeenCalled()

      await act(async () => {
        await result.current.pauseWorkout()
      })

      expect(workoutSessionStorage.appendHrData).toHaveBeenCalledTimes(1)
    })

    it('should flush buffered data when ending the workout', async () => {
      const { result } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })
      jest.mocked(workoutSessionStorage.saveSession).mockClear()

      act(() => {
        result.current.addHrData(140)
      })
      expect(workoutSessionStorage.appendHrData).not.toHaveBeenCalled()

      await act(async () => {
        await result.current.endWorkout()
      })

      // Flush data
      expect(workoutSessionStorage.appendHrData).toHaveBeenCalled()
      // Save session status change
      expect(workoutSessionStorage.saveSession).toHaveBeenCalled()
    })

    it('should flush buffered data on unmount', async () => {
      const { result, unmount } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })
      jest.mocked(workoutSessionStorage.saveSession).mockClear()

      act(() => {
        result.current.addHrData(150)
      })

      // Unmount the component
      unmount()

      // Allow async cleanup to complete
      await act(async () => {
        await Promise.resolve()
      })

      // The cleanup function of the useEffect should trigger a flush
      expect(workoutSessionStorage.appendHrData).toHaveBeenCalled()
    })
  })

  describe('Hydration Logic', () => {
    it('should hydrate a running session and catch up duration', () => {
      const now = Date.now()
      const startTime = now - 60000 // 1 minute ago
      const storedState = {
        status: 'running',
        startTime,
        startCalories: 0,
        totalPaused: 0,
        pauseTime: null,
        sessionId: 'test-session',
      }
      localStorage.setItem(
        'hrm_dashboard:active_session',
        JSON.stringify(storedState)
      )

      const { result } = renderHook(() => useWorkoutSession({}))

      expect(result.current.workoutStatus).toBe('running')
      // Duration should be approx 60 seconds
      expect(result.current.workoutDuration).toBeGreaterThanOrEqual(60)
      expect(result.current.workoutDuration).toBeLessThan(62) // Allow small delta
      expect(result.current.sessionId).toBe('test-session')
    })

    it('should hydrate a paused session and calculate correct duration', () => {
      const now = Date.now()
      const startTime = now - 120000 // 2 minutes ago
      const pauseTime = now - 60000 // Paused 1 minute ago
      // Running time before pause: 1 minute
      const storedState = {
        status: 'paused',
        startTime,
        startCalories: 0,
        totalPaused: 0,
        pauseTime,
        sessionId: 'test-session-paused',
      }
      localStorage.setItem(
        'hrm_dashboard:active_session',
        JSON.stringify(storedState)
      )

      const { result } = renderHook(() => useWorkoutSession({}))

      expect(result.current.workoutStatus).toBe('paused')
      // Duration should be approx 60 seconds (time active before pause)
      expect(result.current.workoutDuration).toBe(60)
    })
  })
})
