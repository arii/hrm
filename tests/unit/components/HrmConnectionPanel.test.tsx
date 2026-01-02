/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSession } from 'next-auth/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

// Mocks
jest.mock('next-auth/react')
jest.mock('@/hooks/useBluetoothHRM')
jest.mock('@/components/HrTileWrapper', () => ({
  __esModule: true,
  default: ({ user }: { user: { name: string; value: number | null } }) => (
    <div data-testid="mock-hr-tile">
      <p>{user.name}</p>
      <p>{user.value}</p>
    </div>
  ),
}))
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

describe('HrmConnectionPanel', () => {
  const mockUseSession = useSession as jest.Mock
  const mockUseBluetoothHRM = useBluetoothHRM as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock

  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null })
    mockUseBluetoothHRM.mockReturnValue({
      connectAndStream: jest.fn(),
      disconnect: jest.fn(),
      deviceStatus: 'Disconnected',
      batteryLevel: null,
      isConnected: false,
      isSupported: true,
    })
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
  })

  it('renders connect button and skeleton when no data is available', () => {
    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
    expect(
      screen.getByRole('button', { name: /Connect Heart Rate Monitor/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('hr-tile-grid-item')).toBeInTheDocument()
  })

  it('renders HR tiles when hrmData is available', () => {
    mockUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: '1', name: 'Test User', value: 120 }],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
    expect(screen.getByTestId('mock-hr-tile')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
  })
})
