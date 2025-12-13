/** @jest-environment jsdom */

import HrmTiles from '@/components/HrmTiles'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

// Mock the context and child component for isolation
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useBluetoothHRM', () => ({
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
const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseBluetoothHRM = useBluetoothHRM as jest.Mock

describe('HrmTiles', () => {
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
  })

  it('should render HRM data correctly for a user', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    render(<HrmTiles />)

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

    render(<HrmTiles />)

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

    render(<HrmTiles />)

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

    render(<HrmTiles />)

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

    render(<HrmTiles />)

    // Only the 'Valid User' tile should be rendered
    const tiles = screen.getAllByTestId('mock-hr-tile')
    expect(tiles).toHaveLength(1)
    expect(within(tiles[0]).getByText('Valid User')).toBeInTheDocument()
    expect(within(tiles[0]).getByText('130')).toBeInTheDocument()
  })
})
