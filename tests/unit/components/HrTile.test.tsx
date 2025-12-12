/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { useHeartRateMetrics } from '@/hooks/useHeartRateMetrics'
import { useUserPreferences } from '@/hooks/useUserPreferences'

jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useHeartRateMetrics')
jest.mock('@/hooks/useUserPreferences')

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseHeartRateMetrics = useHeartRateMetrics as jest.Mock
const mockedUseUserPreferences = useUserPreferences as jest.Mock

describe('HrTile', () => {
  beforeEach(() => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
    })
    mockedUseHeartRateMetrics.mockReturnValue({
      currentHeartRate: 150,
      averageHeartRate: 140,
      maxHeartRate: 160,
    })
    mockedUseUserPreferences.mockReturnValue([
      {
        maxHr: 190,
      },
    ])
  })

  it('should render the component with the correct data', () => {
    render(
      <HrTile
        clientId="user1"
        name="Ariel"
        isAlerting={false}
        alertMessage=""
      />
    )

    expect(screen.getByText('Ariel')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('Avg: 140')).toBeInTheDocument()
    expect(screen.getByText('Max: 160')).toBeInTheDocument()
  })

  it('should show an alert message when isAlerting is true', () => {
    render(
      <HrTile
        clientId="user1"
        name="Ariel"
        isAlerting={true}
        alertMessage="Signal lost"
      />
    )

    expect(screen.getByText('Signal lost')).toBeInTheDocument()
  })
})
