/**
 * @jest-environment jsdom
 */
// tests/unit/components/ExperimentalAnalyticsPage.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import ExperimentalAnalyticsPage from '@/app/client/experimental/components/ExperimentalAnalyticsPage'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'

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

describe('ExperimentalAnalyticsPage', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock
  const mockUseWorkoutSessionManager = useWorkoutSessionManager as jest.Mock

  beforeEach(() => {
    mockUseUserSettings.mockReturnValue([
      { userAge: 30, userWeight: 70 },
      () => {},
    ])
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: { currentPhase: 'IDLE' },
    })
    mockUseWorkoutSessionManager.mockReturnValue({
      session: null,
      status: 'idle',
      isInitialized: false, // Set to false to prevent async loadSessions call
      duration: 0,
      startWorkout: jest.fn(),
      resumeWorkout: jest.fn(),
      endWorkout: jest.fn(),
      resetWorkout: jest.fn(),
      addHrData: jest.fn(),
    })
  })

  it('should render without crashing', () => {
    const { getByText } = render(<ExperimentalAnalyticsPage />)
    // The page shows "New Workout" button and "Workout History" when no active session
    expect(getByText('New Workout')).toBeInTheDocument()
    expect(getByText('Workout History')).toBeInTheDocument()
  })

  it('sends HRM_METADATA_UPDATE when WebSocket is connected', () => {
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
  })
})
