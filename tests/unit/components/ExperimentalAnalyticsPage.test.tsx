/**
 * @jest-environment jsdom
 */
// tests/unit/components/ExperimentalAnalyticsPage.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import ExperimentalAnalyticsPage from '@/app/client/experimental/components/ExperimentalAnalyticsPage'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div className="ResponsiveContainer">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div className="LineChart">{children}</div>
  ),
  Line: () => null, // Mock simple components
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

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
})
