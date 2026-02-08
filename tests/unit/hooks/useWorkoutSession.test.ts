/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import {
  workoutSessionStorage,
  HrZoneName,
} from '@/lib/workout-session-storage'

// Mock the storage module
jest.mock('@/lib/workout-session-storage', () => ({
  workoutSessionStorage: {
    saveSession: jest.fn().mockResolvedValue(undefined),
    appendHrData: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue({
      sessionId: 'test-session-id',
      status: 'running',
      hrHistory: [
        { time: 1000, hr: 80 },
        { time: 2000, hr: 85 },
      ],
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
      const [_sessionId, buffer] = jest.mocked(
        workoutSessionStorage.appendHrData
      ).mock.calls[0]
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

    it('should persist minimal state to localStorage (excluding duration) with debounce', async () => {
      const { result } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })

      // Wait for state update - debounce is 1000ms
      await act(async () => {
        jest.advanceTimersByTime(1100)
      })

      const stored = localStorage.getItem('hrm_dashboard:active_session')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)

      // Verify duration is NOT persisted as the live value (to prevent 1Hz thrashing)
      expect(parsed.duration).toBe(0)
      // Verify essential state IS persisted
      expect(parsed.status).toBe('running')
      expect(parsed.startTime).toBeDefined()
      expect(parsed.sessionId).toBeDefined()
    })

    it('should load hrHistory from IndexedDB on mount', async () => {
      // Simulate existing session in localStorage
      localStorage.setItem(
        'hrm_dashboard:active_session',
        JSON.stringify({
          status: 'running',
          duration: 0,
          sessionId: 'test-session-id',
          startTime: Date.now() - 5000,
        })
      )

      const { result } = renderHook(() => useWorkoutSession({}))

      // Wait for async effect
      await act(async () => {
        await Promise.resolve()
      })

      expect(workoutSessionStorage.getSession).toHaveBeenCalledWith(
        'test-session-id'
      )
      // hrHistory should be populated from the mock
      expect(result.current.hrHistory).toHaveLength(2)
      expect(result.current.hrHistory[0].hr).toBe(80)
    })

    it('should attach pagehide/beforeunload listeners for data safety', async () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const { result } = renderHook(() => useWorkoutSession({}))

      act(() => {
        result.current.startWorkout()
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'pagehide',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('should recover buffered HR data from localStorage on mount', async () => {
      const sessionId = 'test-session-id'
      const buffer = [{ time: 1000, hr: 120 }]

      localStorage.setItem(
        'hrm_dashboard:active_session',
        JSON.stringify({
          status: 'running',
          sessionId,
          startTime: Date.now() - 10000,
          duration: 0,
        })
      )
      localStorage.setItem('hrm_dashboard:hr_buffer', JSON.stringify(buffer))

      // Re-mock getSession to return a session matching this ID
      jest.mocked(workoutSessionStorage.getSession).mockResolvedValueOnce({
        sessionId,
        status: 'running',
        hrHistory: [],
        timeInZones: {
          [HrZoneName.Rest]: 0,
          [HrZoneName.WarmUp]: 0,
          [HrZoneName.FatBurn]: 0,
          [HrZoneName.Cardio]: 0,
          [HrZoneName.Peak]: 0,
        },
        maxHr: 0,
        averageHr: 0,
        calorieHistory: [],
        totalCaloriesBurned: 0,
        userSettings: { age: 30, weight: 70, maxHr: 190 },
        lastSyncTime: 0,
        syncStatus: 'pending',
      } as unknown as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      renderHook(() => useWorkoutSession({}))

      await act(async () => {
        await Promise.resolve() // Wait for effects
      })

      expect(workoutSessionStorage.appendHrData).toHaveBeenCalledWith(
        sessionId,
        buffer
      )
      // We expect the buffer to be cleared from localStorage after recovery
      // Note: The promise needs to resolve. We use Promise.resolve() above but might need more ticks.
      // But we can check if the call happened.
    })

    it('should transition to finished status on endWorkout', async () => {
      const { result } = renderHook(() => useWorkoutSession({}))
      act(() => result.current.startWorkout())
      await act(async () => result.current.endWorkout())
      expect(result.current.workoutStatus).toBe('finished')
    })

    it('should throttle hrHistory updates', async () => {
      const { result } = renderHook(() => useWorkoutSession({}))
      act(() => result.current.startWorkout())

      // First point updates immediately (because lastUpdate is 0)
      act(() => result.current.addHrData(100))
      expect(result.current.hrHistory).toHaveLength(1)

      // Second point immediately after
      act(() => result.current.addHrData(105))
      // Should NOT update hrHistory yet (throttle is 5000ms from last update)
      expect(result.current.hrHistory).toHaveLength(1)

      // Advance time by 6000ms
      await act(async () => {
        jest.advanceTimersByTime(6000)
      })

      // Trigger another update
      act(() => result.current.addHrData(110))

      // Now it should have updated with pending points (105) AND current point (110)
      expect(result.current.hrHistory).toHaveLength(3)
    })
  })
})
