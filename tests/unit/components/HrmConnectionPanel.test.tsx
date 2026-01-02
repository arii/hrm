/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useWebSocket } from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

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

describe('HrmConnectionPanel', () => {
  const mockUseWebSocket = useWebSocket as jest.Mock

  beforeEach(() => {
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
  })

  it('renders a placeholder message and no connect link when no data is available', () => {
    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
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
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
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
      connectionStatus: 'Connecting...',
      activeAlerts: [],
    })
    const { container } = render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
    // Expect one skeleton to be present for the placeholder
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(1)
  })
})
