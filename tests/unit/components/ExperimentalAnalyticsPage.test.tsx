/**
 * @jest-environment jsdom
 */
// tests/unit/components/ExperimentalAnalyticsPage.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import ExperimentalAnalyticsPage from '@/app/client/experimental/components/ExperimentalAnalyticsPage'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'

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

import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'

describe('ExperimentalAnalyticsPage', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock
  const mockUseWorkoutSessionManager = useWorkoutSessionManager as jest.Mock
  const mockStartWorkout = jest.fn()

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
      connectionStatus: 'Connected',
    })
    mockUseWorkoutSessionManager.mockReturnValue({
      status: 'idle',
      startWorkout: mockStartWorkout,
      addHrData: jest.fn(),
      processHeartRate: jest.fn(),
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

  describe('Auto-start workout', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should call startWorkout when status is idle and valid HR data is received', () => {
      mockUseWebSocket.mockReturnValue({
        hrmData: [{ time: Date.now(), value: 100 }],
        timerData: null,
        sendData: jest.fn(),
        connectionStatus: 'Connected',
      })
      render(<ExperimentalAnalyticsPage />)
      jest.runAllTimers()
      expect(mockStartWorkout).toHaveBeenCalled()
    })

    it('should not call startWorkout if status is not idle', () => {
      mockUseWorkoutSessionManager.mockReturnValue({
        status: 'running',
        startWorkout: mockStartWorkout,
        addHrData: jest.fn(),
        processHeartRate: jest.fn(),
      })
      mockUseWebSocket.mockReturnValue({
        hrmData: [{ time: Date.now(), value: 100 }],
        timerData: null,
        sendData: jest.fn(),
        connectionStatus: 'Connected',
      })
      render(<ExperimentalAnalyticsPage />)
      expect(mockStartWorkout).not.toHaveBeenCalled()
    })

    it('should not call startWorkout if hrmData is empty', () => {
      mockUseWebSocket.mockReturnValue({
        hrmData: [],
        timerData: null,
        sendData: jest.fn(),
        connectionStatus: 'Connected',
      })
      render(<ExperimentalAnalyticsPage />)
      expect(mockStartWorkout).not.toHaveBeenCalled()
    })

    it('should not call startWorkout if HR value is 0', () => {
      mockUseWebSocket.mockReturnValue({
        hrmData: [{ time: Date.now(), value: 0 }],
        timerData: null,
        sendData: jest.fn(),
        connectionStatus: 'Connected',
      })
      render(<ExperimentalAnalyticsPage />)
      expect(mockStartWorkout).not.toHaveBeenCalled()
    })
  })
})
