/** @jest-environment jsdom */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../../../lib/workout-session-storage'
import { useAppSnackbar } from '../../../hooks/useAppSnackbar'
import { isSameDay } from '../../../lib/date'
import { WorkoutSessionData } from '../../../lib/workout-session-storage'
import { HeartRateZone } from '../../../lib/shared/hr-zones'
import { estimateCaloriesBurned } from '../../../lib/calorie-estimation'

// Mock dependencies
jest.mock('../../../lib/workout-session-storage')
jest.mock('../../../hooks/useAppSnackbar')
// Mock the entire date utility module
jest.mock('../../../lib/date', () => ({
  isSameDay: jest.fn(),
}))
jest.mock('../../../lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

const mockIsSameDay = isSameDay as jest.Mock
const mockEstimateCaloriesBurned = estimateCaloriesBurned as jest.Mock

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
    mockEstimateCaloriesBurned.mockReturnValue(5) // Default return value for calorie calc

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
        result.current.pauseWorkout()
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

      // Add first data point (HR 120 -> ~65% -> Zone 2 / Warm Up)
      mockDateNow.mockReturnValue(1001000)
      act(() => {
        result.current.addHrData(120)
      })
      expect(result.current.session?.hrHistory.length).toBe(1)
      expect(result.current.session?.maxHr).toBe(120)
      expect(result.current.session?.averageHr).toBe(120)
      expect(result.current.session?.timeInZones.ZONE_2).toBe(1)

      // Add second data point (HR 150 -> ~81% -> Zone 4 / Cardio)
      mockDateNow.mockReturnValue(1002000) // +1 second
      act(() => {
        result.current.addHrData(150)
      })
      expect(result.current.session?.hrHistory.length).toBe(2)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBe(135)
      expect(result.current.session?.timeInZones.ZONE_2).toBe(1)
      expect(result.current.session?.timeInZones.ZONE_4).toBe(1) // 1 second elapsed since last point

      // Calories should have increased by mocked amount (5)
      expect(result.current.session?.totalCaloriesBurned).toBe(5)

      // Add third data point (HR 100 -> ~54% -> Zone 1 / Recovery)
      mockDateNow.mockReturnValue(1004000) // +2 seconds
      act(() => {
        result.current.addHrData(100)
      })
      expect(result.current.session?.hrHistory.length).toBe(3)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBeCloseTo(123.33)
      expect(result.current.session?.timeInZones.ZONE_4).toBe(1)
      // Zone 1 gets +2 seconds
      expect(result.current.session?.timeInZones.ZONE_1).toBe(2)

      // Calories should have increased by mocked amount again (5 + 5 = 10)
      expect(result.current.session?.totalCaloriesBurned).toBe(10)
    })

    it('should smooth HR readings before calculating calories', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80)
      })

      // Mock sequence of HR data: 100, 110, 120
      // Smoothing window is 5.

      // 1. HR 100
      mockDateNow.mockReturnValue(1001000)
      act(() => {
        result.current.addHrData(100)
      })

      // 2. HR 110 (Smoothed: (100+110)/2 = 105)
      mockDateNow.mockReturnValue(1002000)
      act(() => {
        result.current.addHrData(110)
      })

      expect(mockEstimateCaloriesBurned).toHaveBeenLastCalledWith(
        expect.objectContaining({
          heartRate: 105, // Expect smoothed value
        })
      )

      // 3. HR 120 (Smoothed: (100+110+120)/3 = 110)
      mockDateNow.mockReturnValue(1003000)
      act(() => {
        result.current.addHrData(120)
      })

      expect(mockEstimateCaloriesBurned).toHaveBeenLastCalledWith(
        expect.objectContaining({
          heartRate: 110, // Expect smoothed value
        })
      )
    })

    it('should respect gender in calorie calculation', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80, { gender: 'MALE' })
      })

      mockDateNow.mockReturnValue(1001000)
      act(() => {
        result.current.addHrData(140)
      })

      mockDateNow.mockReturnValue(1002000)
      act(() => {
        result.current.addHrData(140)
      })

      expect(mockEstimateCaloriesBurned).toHaveBeenCalledWith(
        expect.objectContaining({
          gender: 'MALE',
        })
      )
    })

    it('should not add HR data if the session is not running', async () => {
      const { result } = renderHook(() => useWorkoutSessionManager())
      await waitFor(() => expect(result.current.isInitialized).toBe(true))

      act(() => {
        result.current.startWorkout(30, 80)
      })

      // Pause the session
      act(() => {
        result.current.pauseWorkout()
      })
      expect(result.current.status).toBe('paused')

      // Attempt to add data
      mockDateNow.mockReturnValue(1001000)
      act(() => {
        result.current.addHrData(130)
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
        timeInZones: {} as Record<HeartRateZone, number>,
        averageHr: 0,
        maxHr: 0,
        totalPaused: 0,
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
        totalCaloriesBurned: 0,
        userSettings: { age: 30, weight: 80, maxHr: 190 },
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
      expect(result.current.session).toEqual(
        expect.objectContaining(todaySession)
      )
    })

    it('should clear an active session when the day changes on window focus', async () => {
      // Arrange
      const todaySession: Partial<WorkoutSessionData> = {
        sessionId: 'active-session-id',
        startTime: 1000000,
        status: 'running',
        userSettings: { age: 30, weight: 80, maxHr: 190 },
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
