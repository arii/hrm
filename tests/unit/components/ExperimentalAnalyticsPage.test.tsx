/**
 * @jest-environment jsdom
 */
// tests/unit/components/ExperimentalAnalyticsPage.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import ExperimentalAnalyticsPage from '@/app/client/experimental/components/ExperimentalAnalyticsPage'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { workoutSessionStorage } from '@/lib/workout-session-storage'
import { waitFor } from '@testing-library/react'

// Mock the HeartRateTimeSeries component by mocking the dynamic import
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => <div>Heart Rate Over Time</div>
  MockComponent.displayName = 'HeartRateTimeSeries'
  return MockComponent
})

// Mock hooks
jest.mock('@/context/UserSettingsContext')
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useWorkoutSession')
jest.mock('@/lib/workout-session-storage', () => ({
  workoutSessionStorage: {
    getAllSessions: jest.fn(),
    deleteSession: jest.fn(),
    getSession: jest.fn(),
  },
}))

describe('ExperimentalAnalyticsPage', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock
  const mockUseWorkoutSession = useWorkoutSession as jest.Mock
  const mockGetAllSessions = workoutSessionStorage.getAllSessions as jest.Mock

  beforeEach(() => {
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
    mockUseWorkoutSession.mockReturnValue({
      sessionId: null,
      workoutStatus: 'idle',
      hasStarted: false,
      workoutDuration: 0,
      startWorkout: jest.fn(),
      pauseWorkout: jest.fn(),
      endWorkout: jest.fn(),
      resetWorkout: jest.fn(),
      addHrData: jest.fn(),
      caloriesBurned: 0,
      startTime: null,
      // Mock derived state
      timeInZones: {},
      averageHr: 0,
      maxHr: 0,
    })
    mockGetAllSessions.mockResolvedValue([])
  })

  it('should render without crashing', async () => {
    const { getByText } = render(<ExperimentalAnalyticsPage />)
    // The page shows "New Workout" button and "Workout History" when no active session
    expect(getByText('New Workout')).toBeInTheDocument()
    expect(getByText('Workout History')).toBeInTheDocument()

    // Wait for session loading to complete to avoid act() warnings
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

    // Wait for session loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(mockGetAllSessions).toHaveBeenCalled()
    })
  })
})
