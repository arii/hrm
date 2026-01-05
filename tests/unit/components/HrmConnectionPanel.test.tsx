/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useWebSocket } from '@/context/WebSocketContext'
import { useUserSettings } from '@/context/UserSettingsContext'

// Mocks
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

// Mock the UserSettings context
jest.mock('@/context/UserSettingsContext', () => ({
  useUserSettings: jest.fn(),
}))

describe('HrmConnectionPanel', () => {
  const mockUseWebSocket = useWebSocket as jest.Mock
  const mockUseUserSettings = useUserSettings as jest.Mock

  beforeEach(() => {
    // Default mock for useUserSettings
    mockUseUserSettings.mockReturnValue([{}, jest.fn()])
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: {
        phase: 'IDLE',
        timeRemaining: 0,
        totalDuration: 0,
      },
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
    jest.clearAllMocks()
    // Mock localStorage before each test as it's accessed in useEffect
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn(() => 'test-client-id') },
      writable: true,
    })
  })

  it('renders a placeholder message and no connect link when no data is available', () => {
    render(<HrmConnectionPanel />)
    expect(screen.getByText('No Heart Rate Data')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Connect/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Connect/i })
    ).not.toBeInTheDocument()
  })

  it('renders HR tiles and no connect link when hrmData is available', () => {
    mockUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: '1', name: 'Test User', value: 120 }],
      timerData: {
        phase: 'IDLE',
        timeRemaining: 0,
        totalDuration: 0,
      },
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
    render(<HrmConnectionPanel />)
    // Check that the HR tile is rendered
    expect(screen.getByTestId('mock-hr-tile')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()

    // Assert that no connect link or button is visible
    expect(
      screen.queryByRole('link', { name: /Connect/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Connect/i })
    ).not.toBeInTheDocument()
  })

  it('renders skeletons when loading', () => {
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: {
        phase: 'IDLE',
        timeRemaining: 0,
        totalDuration: 0,
      },
      connectionStatus: 'Connecting...',
      activeAlerts: [],
    })
    const { container } = render(<HrmConnectionPanel />)
    // Expect one skeleton to be present for the placeholder
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(1)
  })
})
