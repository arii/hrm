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

describe('ExperimentalAnalyticsPage', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock

  beforeEach(() => {
    mockUseUserSettings.mockReturnValue([
      { userAge: 30, userWeight: 70 },
      () => {},
    ])
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: { currentPhase: 'IDLE' },
    })
  })

  it('should render without crashing', () => {
    const { getByText } = render(<ExperimentalAnalyticsPage />)
    expect(getByText('Workout Summary')).toBeInTheDocument()
    expect(getByText('Time in Zones')).toBeInTheDocument()
    expect(getByText('Heart Rate Over Time')).toBeInTheDocument()
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

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_METADATA_UPDATE',
      data: {
        name: 'Test User',
        age: 35,
      },
    })
  })
})
