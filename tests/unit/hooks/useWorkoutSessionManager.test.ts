/** @jest-environment jsdom */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '@/lib/workout-session-storage'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { isSameDay } from '@/lib/date'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { HeartRateZone } from '@/lib/shared/hr-zones'

jest.mock('@/lib/workout-session-storage')
jest.mock('@/hooks/useAppSnackbar')
jest.mock('@/lib/date', () => ({
  isSameDay: jest.fn(),
}))

const mockIsSameDay = isSameDay as jest.Mock

const mockShowInfo = jest.fn()
const mockGetIncompleteSession =
  workoutSessionStorage.getIncompleteSession as jest.Mock
const mockDeleteSession = workoutSessionStorage.deleteSession as jest.Mock

describe('useWorkoutSessionManager', () => {
  let mockDateNow: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({ showInfo: mockShowInfo })
    mockGetIncompleteSession.mockResolvedValue(null)
    mockIsSameDay.mockReturnValue(true)

    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000)
  })

  afterEach(() => {
    mockDateNow.mockRestore()
  })

  describe('Session Lifecycle', () => {
    it('should start, pause, resume, and finish a workout session', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80)
      })
      expect(result.current.status).toBe('running')
      expect(result.current.session).not.toBeNull()
      expect(result.current.session?.startTime).toBe(1000000)
      expect(result.current.session?.status).toBe('running')

      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('paused')
      expect(result.current.session?.status).toBe('paused')
      expect(result.current.session?.endTime).toBeNull()

      act(() => {
        result.current.resumeWorkout()
      })
      expect(result.current.status).toBe('running')
      expect(result.current.session?.status).toBe('running')

      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('paused')

      mockDateNow.mockReturnValue(1005000)
      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('finished')
      expect(result.current.session?.status).toBe('finished')
      expect(result.current.session?.endTime).toBe(1005000)
    })

    it('should reset the workout session and delete it from storage', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80)
      })
      const sessionId = result.current.session?.sessionId
      expect(sessionId).toBeDefined()

      await act(async () => {
        await result.current.resetWorkout()
      })

      expect(result.current.session).toBeNull()
      expect(result.current.status).toBe('idle')
      expect(mockDeleteSession).toHaveBeenCalledWith(sessionId)
    })
  })

  describe('HR Data and Calculations', () => {
    it('should add HR data and correctly calculate metrics', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(35, 75)
      })

      act(() => {
        result.current.addHrData({ time: 1001000, hr: 120 })
      })
      expect(result.current.session?.hrHistory.length).toBe(1)
      expect(result.current.session?.maxHr).toBe(120)
      expect(result.current.session?.averageHr).toBe(120)
      expect(result.current.session?.timeInZones.ZONE_2).toBe(1)

      act(() => {
        result.current.addHrData({ time: 1002000, hr: 150 })
      })
      expect(result.current.session?.hrHistory.length).toBe(2)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBe(135)
      expect(result.current.session?.timeInZones.ZONE_2).toBe(1)
      expect(result.current.session?.timeInZones.ZONE_4).toBe(1)

      act(() => {
        result.current.addHrData({ time: 1004000, hr: 100 })
      })
      expect(result.current.session?.hrHistory.length).toBe(3)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBeCloseTo(123.33)
      expect(result.current.session?.timeInZones.ZONE_4).toBe(1)
      expect(result.current.session?.timeInZones.ZONE_1).toBe(2)
    })

    it('should not add HR data if the session is not running', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80)
      })

      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('paused')

      act(() => {
        result.current.addHrData({ time: 1001000, hr: 130 })
      })

      expect(result.current.session?.hrHistory.length).toBe(0)
      expect(result.current.session?.maxHr).toBe(0)
      expect(result.current.session?.averageHr).toBe(0)
    })
  })

  describe('Stale Session Handling', () => {
    it('should clear an incomplete session from a previous day on startup', async () => {
      const staleSession: WorkoutSessionData = {
        sessionId: 'stale-session-id',
        startTime: 900000,
        status: 'running',
        hrHistory: [],
        timeInZones: {} as Record<HeartRateZone, number>,
        averageHr: 0,
        maxHr: 0,
        calorieHistory: [],
        totalCaloriesBurned: 0,
        userSettings: { age: 30, weight: 80, maxHr: 190 },
        lastSyncTime: 900000,
        syncStatus: 'pending',
        endTime: null,
      }
      mockGetIncompleteSession.mockResolvedValue(staleSession)
      mockIsSameDay.mockReturnValue(false)

      const { result } = renderHook(() => useWorkoutSessionManager())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(mockIsSameDay).toHaveBeenCalled()
      expect(mockDeleteSession).toHaveBeenCalledWith('stale-session-id')
      expect(mockShowInfo).toHaveBeenCalledWith(
        'New day detected. Your previous session was cleared.'
      )
      expect(result.current.session).toBeNull()
    })

    it('should not clear a session from the same day on startup', async () => {
      const todaySession: Partial<WorkoutSessionData> = {
        sessionId: 'today-session-id',
        startTime: 1000000,
        status: 'paused',
      }
      mockGetIncompleteSession.mockResolvedValue(todaySession)
      mockIsSameDay.mockReturnValue(true)

      const { result } = renderHook(() => useWorkoutSessionManager())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(mockDeleteSession).not.toHaveBeenCalled()
      expect(mockShowInfo).not.toHaveBeenCalled()
      expect(result.current.session).toEqual(todaySession)
    })

    it('should clear an active session when the day changes on window focus', async () => {
      const todaySession: Partial<WorkoutSessionData> = {
        sessionId: 'active-session-id',
        startTime: 1000000,
        status: 'running',
      }
      mockGetIncompleteSession.mockResolvedValue(todaySession)
      mockIsSameDay.mockReturnValue(true)

      const { result } = renderHook(() => useWorkoutSessionManager())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(result.current.session).not.toBeNull()

      mockIsSameDay.mockReturnValue(false)

      act(() => {
        window.dispatchEvent(new Event('focus'))
      })

      await waitFor(() => {
        expect(mockDeleteSession).toHaveBeenCalledWith('active-session-id')
      })
      expect(mockShowInfo).toHaveBeenCalledWith(
        'New day detected. A fresh workout session has started.'
      )
    })
  })
})
