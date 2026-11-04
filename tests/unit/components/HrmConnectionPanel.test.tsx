/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import {
  mockUseActiveAlerts,
  mockUseHrmData,
  mockUseWebSocketConnection,
} from '../../mocks/contexts'
import '../../mocks/components.tsx'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { mockHrmData } from '../../fixtures/hrm'

describe('HrmConnectionPanel', () => {
  beforeEach(() => {
    mockUseHrmData.mockReturnValue([])
    mockUseActiveAlerts.mockReturnValue([])
    mockUseWebSocketConnection.mockReturnValue({
      connectionStatus: 'Connected',
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
    mockUseHrmData.mockReturnValue(mockHrmData)
    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
    // Check that the HR tile is rendered
    const tiles = screen.getAllByTestId('mock-hr-tile')
    expect(tiles).toHaveLength(2)
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

  it('renders a loading indicator when connection is pending', () => {
    mockUseWebSocketConnection.mockReturnValue({
      connectionStatus: 'Connecting...',
    })
    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
    expect(screen.getByTestId('hrm-connection-loading')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('No Heart Rate Data')).not.toBeInTheDocument()
  })

  // NOTE (UX branch): leader's #9024 Skeleton-loader test is intentionally
  // dropped here — this branch's held redesign uses a CircularProgress
  // spinner for the loading state (asserted above), not a skeleton.
  it('renders no skeleton in the idle empty state (loader is transient-only)', () => {
    mockUseHrmData.mockReturnValue([])
    mockUseActiveAlerts.mockReturnValue([])
    mockUseWebSocketConnection.mockReturnValue({
      connectionStatus: 'Connected',
    })
    const { container } = render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )
    // A pulsing skeleton that never resolves lies to users and trips the VRT
    // readiness gate (waitForPageReady waits for skeletons to disappear).
    expect(screen.getByText('No Heart Rate Data')).toBeInTheDocument()
    expect(screen.queryByTestId('hr-tile-grid-item')).not.toBeInTheDocument()
    expect(container.querySelector('.MuiSkeleton-root')).toBeNull()
  })
})
