/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '@/lib/workout-session-storage'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'

<<<<<<< HEAD
jest.mock('@/lib/workout-session-storage')
jest.mock('@/hooks/useAppSnackbar')
=======
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../../../lib/workout-session-storage'
import { useAppSnackbar } from '../../../hooks/useAppSnackbar'
import { isSameDay } from '../../../lib/date'
import { WorkoutSessionData } from '../../../lib/workout-session-storage'
import { HeartRateZone } from '../../../lib/shared/hr-zones'

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
>>>>>>> origin/leader

describe('useWorkoutSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({
      showInfo: jest.fn(),
    })
    ;(
      workoutSessionStorage.getIncompleteSession as jest.Mock
    ).mockResolvedValue(null)
  })

  it('starts a workout session', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    // Wait for initialization
    await act(async () => {
      // Small delay to allow useEffect to run
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.startWorkout(30, 70)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.session).toBeDefined()
    expect(result.current.session?.userSettings.age).toBe(30)
  })

  it('adds heart rate data to session', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.addHrData({ time: Date.now(), hr: 120 })
    })

    expect(result.current.session?.hrHistory).toHaveLength(1)
    expect(result.current.session?.hrHistory[0].hr).toBe(120)
  })

  it('ends and resets a workout session', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

<<<<<<< HEAD
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.startWorkout(30, 70)
=======
      act(() => {
        result.current.startWorkout(35, 75) // maxHr will be calculated as ~185
      })

      // Add first data point (HR 120 -> ~65% -> Zone 2 / Warm Up)
      act(() => {
        result.current.addHrData({ time: 1001000, hr: 120 })
      })
      expect(result.current.session?.hrHistory.length).toBe(1)
      expect(result.current.session?.maxHr).toBe(120)
      expect(result.current.session?.averageHr).toBe(120)
      expect(result.current.session?.timeInZones.ZONE_2).toBe(1)

      // Add second data point (HR 150 -> ~81% -> Zone 4 / Cardio)
      act(() => {
        result.current.addHrData({ time: 1002000, hr: 150 })
      })
      expect(result.current.session?.hrHistory.length).toBe(2)
      expect(result.current.session?.maxHr).toBe(150)
      expect(result.current.session?.averageHr).toBe(135)
      expect(result.current.session?.timeInZones.ZONE_2).toBe(1)
      expect(result.current.session?.timeInZones.ZONE_4).toBe(1)

      // Add third data point (HR 100 -> ~54% -> Zone 1 / Recovery)
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
>>>>>>> origin/leader
    })

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.status).toBe('paused') // transition status in reducer

    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.status).toBe('finished')

    await act(async () => {
      await result.current.resetWorkout()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.session).toBeNull()
  })
})
