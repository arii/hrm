/**
 * @jest-environment jsdom
 */
// tests/unit/components/ExperimentalAnalyticsPage.test.tsx
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import ExperimentalAnalyticsPage from '@/app/client/experimental/components/ExperimentalAnalyticsPage'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '@/lib/workout-session-storage'

// Mock the HeartRateTimeSeries component by mocking the dynamic import
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => <div>Heart Rate Over Time</div>
  MockComponent.displayName = 'HeartRateTimeSeries'
  return MockComponent
})

// Mock hooks
jest.mock('@/context/UserSettingsContext')
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useWorkoutSessionManager')
// Mock useWorkoutTimer since it's used in the component
jest.mock('@/hooks/useWorkoutTimer', () => ({
  useWorkoutTimer: jest.fn().mockReturnValue(0),
}))

jest.mock('@/lib/workout-session-storage', () => ({
  workoutSessionStorage: {
    getAllSessions: jest.fn(),
    deleteSession: jest.fn(),
  },
}))

// Mock fit-export to avoid ESM import issues with @garmin/fitsdk
jest.mock('@/utils/fit-export', () => ({
  generateFitFile: jest.fn(),
}))

describe('ExperimentalAnalyticsPage', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock
  const mockUseWorkoutSessionManager = useWorkoutSessionManager as jest.Mock
  const mockGetAllSessions = workoutSessionStorage.getAllSessions as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseUserSettings.mockReturnValue([
      { userAge: 30, userWeight: 70 },
      () => {},
    ])
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: { currentPhase: 'IDLE' },
      sendData: jest.fn(),
      connectionStatus: 'Disconnected',
    })
    mockUseWorkoutSessionManager.mockReturnValue({
      session: null,
      status: 'idle',
      isInitialized: true,
      caloriesBurned: 0,
      startWorkout: jest.fn(),
      pauseWorkout: jest.fn(),
      resumeWorkout: jest.fn(),
      endWorkout: jest.fn(),
      resetWorkout: jest.fn(),
      addHrData: jest.fn(),
    })
    mockGetAllSessions.mockResolvedValue([])
  })

  it('should render without crashing', async () => {
    const { getByText } = render(<ExperimentalAnalyticsPage />)

    // Check for elements that should exist in 'list' view (default when no session)
    // "View History" is in active view.
    // In list view: "New Workout" button.
    expect(getByText('New Workout')).toBeInTheDocument()

    // "Workout History" might be a header in SessionList?
    // Let's assume SessionList renders something recognizable or check implementation.
    // SessionList is not mocked.

    await waitFor(() => {
      expect(mockGetAllSessions).toHaveBeenCalled()
    })
  })

  it('sends HRM_METADATA_UPDATE when WebSocket is connected', async () => {
    const mockSendData = jest.fn()
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: null,
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    mockUseUserSettings.mockReturnValue([
      { userName: 'Test User', userAge: 35 },
      () => {},
    ])

    render(<ExperimentalAnalyticsPage />)

    // The component sends HRM_METADATA_UPDATE with age and maxHr
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_METADATA_UPDATE',
      data: {
        age: 35,
        maxHr: 185, // 220 - 35
      },
    })

    await waitFor(() => {
      expect(mockGetAllSessions).toHaveBeenCalled()
    })
  })
})
