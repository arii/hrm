/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { mockUseWebSocket } from '../../mocks/contexts'
import '../../mocks/components.tsx'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { mockHrmData } from '../../fixtures/hrm'

describe('HrmConnectionPanel', () => {
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
      hrmData: mockHrmData,
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
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
    // Expect two skeletons to be present for the loading state
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(2)
    // Expect "No Heart Rate Data" message NOT to be present when loading
    expect(screen.queryByText('No Heart Rate Data')).not.toBeInTheDocument()
  })
})
