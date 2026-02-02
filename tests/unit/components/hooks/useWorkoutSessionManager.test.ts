import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../../hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../../../../lib/workout-session-storage'
import { useAppSnackbar } from '../../../../hooks/useAppSnackbar'

// Mock dependencies
jest.mock('../../../../lib/workout-session-storage')
jest.mock('../../../../hooks/useAppSnackbar')

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

    global.Date = class extends realDate {
      constructor(dateString?: string | number | Date) {
        // If a date string is provided, use the original constructor
        if (dateString) {
          super(dateString)
        } else {
          // Otherwise, return 'tomorrow'
          super(tomorrow)
        }
      }

      static now() {
        return tomorrow.getTime()
      }
    } as any

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
})
