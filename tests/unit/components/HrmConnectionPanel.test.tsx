/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'

// Mock the context and child component for isolation
jest.mock('@/context/WebSocketContext')
jest.mock('next-auth/react')
jest.mock('@/hooks/useBluetoothHRM')
jest.mock('@/components/HrTileWithCalories', () => ({
  __esModule: true,
  default: ({ user }: { user: { name: string; value: number | null } }) => (
    <div data-testid="mock-hr-tile">
      <p>{user.name}</p>
      <p>{user.value === null ? 'Signal Drop' : user.value}</p>
    </div>
  ),
}))

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock
const mockedUseBluetoothHRM = useBluetoothHRM as jest.Mock

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UserSettingsProvider>{component}</UserSettingsProvider>)
}

describe('HrmConnectionPanel', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedUseSession.mockReturnValue({ data: null })
    mockedUseBluetoothHRM.mockReturnValue({
      connectAndStream: jest.fn(),
      disconnect: jest.fn(),
      hrmStatus: { status: 'DISCONNECTED', message: 'Disconnected' },
      batteryLevel: null,
      isConnected: false,
    })
  })

  it('should render HRM data correctly for a user', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    renderWithProviders(<HrmConnectionPanel />)

    const tile = screen.getByTestId('mock-hr-tile')
    expect(within(tile).getByText('Ariel')).toBeInTheDocument()
    expect(within(tile).getByText('150')).toBeInTheDocument()
  })

  it('should render "Signal Drop" when value is null', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: null }],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    renderWithProviders(<HrmConnectionPanel />)

    const tile = screen.getByTestId('mock-hr-tile')
    expect(within(tile).getByText('Ariel')).toBeInTheDocument()
    expect(within(tile).getByText('Signal Drop')).toBeInTheDocument()
  })

  it('should render skeleton containers when hrmData is empty', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    renderWithProviders(<HrmConnectionPanel />)

    // The component renders skeleton containers when there's no data
    expect(screen.getAllByTestId('hr-tile-grid-item')).toHaveLength(1)
    // And no actual HrTile components are rendered
    expect(screen.queryByTestId('mock-hr-tile')).not.toBeInTheDocument()
  })

  it('should render skeleton containers when connection status is not "Connected"', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connecting...',
      activeAlerts: [],
    })

    renderWithProviders(<HrmConnectionPanel />)

    expect(screen.getAllByTestId('hr-tile-grid-item')).toHaveLength(1)
    expect(screen.queryByTestId('mock-hr-tile')).not.toBeInTheDocument()
  })

  it('should filter out users with placeholder names', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [
        { clientId: 'user1', name: 'new user (1)', value: 120 },
        { clientId: 'user3', name: 'Valid User', value: 130 },
      ],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    renderWithProviders(<HrmConnectionPanel />)

    // Only the 'Valid User' tile should be rendered
    const tiles = screen.getAllByTestId('mock-hr-tile')
    expect(tiles).toHaveLength(1)
    expect(within(tiles[0]).getByText('Valid User')).toBeInTheDocument()
    expect(within(tiles[0]).getByText('130')).toBeInTheDocument()
  })
})
