/** @jest-environment jsdom */

import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the context and child component for isolation
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useBluetoothHRM', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('@/hooks/useUserPreferences', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('@/components/HrTile', () => ({
  __esModule: true,
  default: ({ name, bpm }: { name: string; bpm: number | null }) => (
    <div data-testid="mock-hr-tile">
      <p>{name}</p>
      <p>{bpm === null ? 'Signal Drop' : bpm}</p>
    </div>
  ),
}))

import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import useUserPreferences from '@/hooks/useUserPreferences'
const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseBluetoothHRM = useBluetoothHRM as jest.Mock
const mockedUseUserPreferences = useUserPreferences as jest.Mock

describe('HrmConnectionPanel', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedUseBluetoothHRM.mockReturnValue({
      connectAndStream: jest.fn(),
      disconnect: jest.fn(),
      deviceStatus: 'Disconnected',
      batteryLevel: null,
      isConnected: false,
      isSupported: true,
    })
    mockedUseUserPreferences.mockReturnValue({
      user: { name: 'Test User', age: 30 },
    })
  })

  it('should render HRM data correctly for a user', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    render(<HrmConnectionPanel />)

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

    render(<HrmConnectionPanel />)

    const tile = screen.getByTestId('mock-hr-tile')
    expect(within(tile).getByText('Ariel')).toBeInTheDocument()
    expect(within(tile).getByText('Signal Drop')).toBeInTheDocument()
  })

  it('should render connection UI and one skeleton when hrmData is empty', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    render(<HrmConnectionPanel />)

    // The component renders the connection UI and one skeleton tile
    expect(
      screen.getByText('Connect Your Heart Rate Monitor')
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('hr-tile-grid-item')).toHaveLength(1)
    expect(screen.queryByTestId('mock-hr-tile')).not.toBeInTheDocument()
  })

  it('should render connection UI when connection status is not "Connected"', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connecting...',
      activeAlerts: [],
    })

    render(<HrmConnectionPanel />)

    expect(
      screen.getByText('Connect Your Heart Rate Monitor')
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('hr-tile-grid-item')).toHaveLength(1)
    expect(screen.queryByTestId('mock-hr-tile')).not.toBeInTheDocument()
  })

  it('should filter out users with placeholder names or a value of 0', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [
        { clientId: 'user1', name: 'new user (1)', value: 120 },
        { clientId: 'user2', name: 'Ariel', value: 0 },
        { clientId: 'user3', name: 'Valid User', value: 130 },
      ],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    render(<HrmConnectionPanel />)

    // Only the 'Valid User' tile should be rendered
    const tiles = screen.getAllByTestId('mock-hr-tile')
    expect(tiles).toHaveLength(1)
    expect(within(tiles[0]).getByText('Valid User')).toBeInTheDocument()
    expect(within(tiles[0]).getByText('130')).toBeInTheDocument()
  })

  it('should call connectAndStream when the connect button is clicked', async () => {
    const connectAndStream = jest.fn()
    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
    mockedUseBluetoothHRM.mockReturnValue({
      connectAndStream,
      disconnect: jest.fn(),
      deviceStatus: 'Disconnected',
      batteryLevel: null,
      isConnected: false,
      isSupported: true,
    })

    render(<HrmConnectionPanel />)
    await userEvent.click(screen.getByText('Connect HR Monitor'))
    expect(connectAndStream).toHaveBeenCalled()
  })

  it('should call disconnect when the disconnect button is clicked', async () => {
    const disconnect = jest.fn()
    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
    mockedUseBluetoothHRM.mockReturnValue({
      connectAndStream: jest.fn(),
      disconnect,
      deviceStatus: 'Connected',
      batteryLevel: 80,
      isConnected: true,
      isSupported: true,
    })

    render(<HrmConnectionPanel />)
    await userEvent.click(screen.getByText('Disconnect HR Monitor'))
    expect(disconnect).toHaveBeenCalled()
  })
})
