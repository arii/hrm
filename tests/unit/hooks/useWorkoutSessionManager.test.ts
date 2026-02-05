/** @jest-environment jsdom */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../../../lib/workout-session-storage'
import { useAppSnackbar } from '../../../hooks/useAppSnackbar'

// Mock dependencies
jest.mock('../../../lib/workout-session-storage')
jest.mock('../../../hooks/useAppSnackbar')

const mockShowInfo = jest.fn()
const mockGetIncompleteSession =
  workoutSessionStorage.getIncompleteSession as jest.Mock
const mockDeleteSession = workoutSessionStorage.deleteSession as jest.Mock

describe('useWorkoutSessionManager', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({ showInfo: mockShowInfo })
  })

  it('should clear an incomplete session from a previous day on startup', async () => {
    // Arrange
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const staleSession = {
      sessionId: 'stale-session-id',
      startTime: yesterday.getTime(),
      status: 'running',
    }

    mockGetIncompleteSession.mockResolvedValue(staleSession)

    // Act
    const { result } = renderHook(() => useWorkoutSessionManager())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    // Assert
    expect(mockGetIncompleteSession).toHaveBeenCalledTimes(1)
    expect(mockDeleteSession).toHaveBeenCalledWith('stale-session-id')
    expect(mockShowInfo).toHaveBeenCalledWith(
      'New day detected. Your previous session was cleared.'
    )
    expect(result.current.session).toBeNull()
    expect(result.current.isInitialized).toBe(true)
  })

  it('should not clear a session from the same day', async () => {
    // Arrange
    const todaySession = {
      sessionId: 'today-session-id',
      startTime: new Date().getTime(),
      status: 'paused',
    }

    mockGetIncompleteSession.mockResolvedValue(todaySession)

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
    const todaySession = {
      sessionId: 'active-session-id',
      startTime: new Date().getTime(),
      status: 'running',
    }
    mockGetIncompleteSession.mockResolvedValue(todaySession)

    const { result } = renderHook(() => useWorkoutSessionManager())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    expect(result.current.session).not.toBeNull()

    // --- Time Travel: Simulate the date changing ---
    const realDate = global.Date
    const tomorrow = new realDate()
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Helper to mock Date
    const mockDate = class extends realDate {
        constructor(dateString?: string | number | Date) {
            if (dateString) {
                super(dateString)
            } else {
                super(tomorrow)
            }
        }
        static now() {
            return tomorrow.getTime()
        }
    } as unknown as typeof Date

    global.Date = mockDate

    // Act
    act(() => {
      // Manually trigger the focus event
      window.dispatchEvent(new Event('focus'))
    })

    // Assert
    await waitFor(() => {
      expect(mockDeleteSession).toHaveBeenCalledWith('active-session-id')
    })
    expect(mockShowInfo).toHaveBeenCalledWith(
      'New day detected. A fresh workout session has started.'
    )

    // Restore Date mock
    global.Date = realDate
  })

  it('should handle workout lifecycle: start, pause, resume, finish', async () => {
    mockGetIncompleteSession.mockResolvedValue(null)
    const { result } = renderHook(() => useWorkoutSessionManager())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    // START
    const startTime = 1000
    jest.spyOn(Date, 'now').mockReturnValue(startTime)

    act(() => {
      result.current.startWorkout(30, 70)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.session).not.toBeNull()
    expect(result.current.session?.status).toBe('running')
    expect(result.current.session?.startTime).toBe(startTime)

    // PAUSE
    const pauseTime = 2000
    jest.spyOn(Date, 'now').mockReturnValue(pauseTime)

    act(() => {
      result.current.pauseWorkout()
    })

    expect(result.current.status).toBe('paused')
    expect(result.current.session?.status).toBe('paused')
    expect(result.current.session?.lastPauseStartTime).toBe(pauseTime)

    // RESUME
    const resumeTime = 3000 // Paused for 1000ms
    jest.spyOn(Date, 'now').mockReturnValue(resumeTime)

    act(() => {
      result.current.resumeWorkout()
    })

    expect(result.current.status).toBe('running')
    expect(result.current.session?.status).toBe('running')
    expect(result.current.session?.lastPauseStartTime).toBeNull()
    expect(result.current.session?.totalPausedTime).toBe(1000)

    // FINISH
    const finishTime = 4000
    jest.spyOn(Date, 'now').mockReturnValue(finishTime)

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.status).toBe('finished')
    expect(result.current.session?.status).toBe('finished')
    expect(result.current.session?.endTime).toBe(finishTime)

    jest.restoreAllMocks()
  })

  it('should update calories', async () => {
    mockGetIncompleteSession.mockResolvedValue(null)
    const { result } = renderHook(() => useWorkoutSessionManager())
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.updateCalories(150)
    })

    expect(result.current.caloriesBurned).toBe(150)
    expect(result.current.session?.totalCaloriesBurned).toBe(150)
  })
})
