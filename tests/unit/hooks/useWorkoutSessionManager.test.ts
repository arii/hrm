/** @jest-environment jsdom */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../../../lib/workout-session-storage'
import { useAppSnackbar } from '../../../hooks/useAppSnackbar'
import { isSameDay } from '../../../lib/date'
import { WorkoutSessionData } from '../../../lib/workout-session-storage'
import { HrZoneName } from '../../../lib/shared/hr-zones'

// Mock dependencies
jest.mock('../../../lib/workout-session-storage')
jest.mock('../../../hooks/useAppSnackbar')
// Mock the entire date utility module
jest.mock('../../../lib/date', () => ({
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
    // Reset mocks before each test
    jest.clearAllMocks()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({ showInfo: mockShowInfo })
    mockGetIncompleteSession.mockResolvedValue(null) // Default to no incomplete session
    mockIsSameDay.mockReturnValue(true) // Default to same day

    // Mock Date.now() to control time-based calculations
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000)
  })

  afterEach(() => {
    mockDateNow.mockRestore()
  })

  describe('Session Lifecycle', () => {
    it('should start, pause, resume, and finish a workout session', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      // Start
      act(() => {
        result.current.startWorkout(30, 80)
      })
      expect(result.current.status).toBe('running')
      expect(result.current.session).not.toBeNull()
      expect(result.current.session?.startTime).toBe(1000000)
      expect(result.current.session?.status).toBe('running')

      // Pause
      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('paused')
      expect(result.current.session?.status).toBe('paused')
      expect(result.current.session?.endTime).toBeNull()

      // Resume
      act(() => {
        result.current.resumeWorkout()
      })
      expect(result.current.status).toBe('running')
      expect(result.current.session?.status).toBe('running')

      // Pause again before finishing
      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('paused')

      // Finish
      mockDateNow.mockReturnValue(1005000) // Advance time
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

      // Start a session to have something to reset
      act(() => {
        result.current.startWorkout(30, 80)
      })
      const sessionId = result.current.session?.sessionId
      expect(sessionId).toBeDefined()

      // Reset
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
        result.current.startWorkout(35, 75) // maxHr will be calculated as ~185
      })

      // Add first data point (HR 120 -> ~65% -> Zone 2 / Fat Burn)
      act(() => {
        result.current.addHrData({ time: 1001000, hr: 120 })
      })
      expect(result.current.session?.hrHistory.length).toBe(1)
      expect(result.current.session?.maxHr).toBe(120)
      expect(result.current.session?.averageHr).toBe(120)
      expect(result.current.session?.timeInZones[HrZoneName.FatBurn]).toBe(1)

      // Add second data point (HR 150 -> ~81% -> Zone 3 / Cardio)
      act(() => {
        result.current.addHrData({ time: 1002000, hr: 150 })
      })
      expect(result.current.session?.hrHistory.length).toBe(2)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBe(135)
      expect(result.current.session?.timeInZones[HrZoneName.FatBurn]).toBe(1)
      expect(result.current.session?.timeInZones[HrZoneName.Cardio]).toBe(1)

      // Add third data point (HR 100 -> ~54% -> Zone 1 / Warm-up)
      act(() => {
        result.current.addHrData({ time: 1004000, hr: 100 })
      })
      expect(result.current.session?.hrHistory.length).toBe(3)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBeCloseTo(123.33)
      expect(result.current.session?.timeInZones[HrZoneName.Cardio]).toBe(1)
      expect(result.current.session?.timeInZones[HrZoneName.WarmUp]).toBe(2)
    })

    it('should not add HR data if the session is not running', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80)
      })

      // Pause the session
      act(() => {
        result.current.endWorkout()
      })
      expect(result.current.status).toBe('paused')

      // Attempt to add data
      act(() => {
        result.current.addHrData({ time: 1001000, hr: 130 })
      })

      // Assert no changes
      expect(result.current.session?.hrHistory.length).toBe(0)
      expect(result.current.session?.maxHr).toBe(0)
      expect(result.current.session?.averageHr).toBe(0)
    })
  })

  describe('Stale Session Handling', () => {
    it('should clear an incomplete session from a previous day on startup', async () => {
      // Arrange
      const staleSession: WorkoutSessionData = {
        sessionId: 'stale-session-id',
        startTime: 900000, // A time in the past
        status: 'running',
        hrHistory: [],
        timeInZones: {} as Record<HrZoneName, number>,
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
      mockIsSameDay.mockReturnValue(false) // Mock as a different day

      // Act
      const { result } = renderHook(() => useWorkoutSessionManager())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      // Assert
      expect(mockIsSameDay).toHaveBeenCalled()
      expect(mockDeleteSession).toHaveBeenCalledWith('stale-session-id')
      expect(mockShowInfo).toHaveBeenCalledWith(
        'New day detected. Your previous session was cleared.'
      )
      expect(result.current.session).toBeNull()
    })

    it('should not clear a session from the same day on startup', async () => {
      // Arrange
      const todaySession: Partial<WorkoutSessionData> = {
        sessionId: 'today-session-id',
        startTime: 1000000,
        status: 'paused',
      }
      mockGetIncompleteSession.mockResolvedValue(todaySession)
      mockIsSameDay.mockReturnValue(true) // Mock as the same day

      // Act
      const { result } = renderHook(() => useWorkoutSessionManager())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      // Assert
      expect(mockDeleteSession).not.toHaveBeenCalled()
      expect(mockShowInfo).not.toHaveBeenCalled()
      expect(result.current.session).toEqual(todaySession)
    })

    it('should clear an active session when the day changes on window focus', async () => {
      // Arrange
      const todaySession: Partial<WorkoutSessionData> = {
        sessionId: 'active-session-id',
        startTime: 1000000,
        status: 'running',
      }
      mockGetIncompleteSession.mockResolvedValue(todaySession)
      mockIsSameDay.mockReturnValue(true) // Initially, it's the same day

      const { result } = renderHook(() => useWorkoutSessionManager())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(result.current.session).not.toBeNull()

      // --- Simulate the date changing ---
      mockIsSameDay.mockReturnValue(false) // Now, it's a different day

      // Act
      act(() => {
        window.dispatchEvent(new Event('focus'))
      })

      // Assert
      await waitFor(() => {
        expect(mockDeleteSession).toHaveBeenCalledWith('active-session-id')
      })
      expect(mockShowInfo).toHaveBeenCalledWith(
        'New day detected. A fresh workout session has started.'
      )
    })
  })
})
