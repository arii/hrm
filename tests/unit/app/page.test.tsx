/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import DashboardContent from '../../../app/page'
import { WebSocketProvider } from '../../../context/WebSocketContext'
import { UserSettingsProvider } from '../../../context/UserSettingsContext'
import { WorkoutProvider } from '../../../context/WorkoutContext'

// Mock child components to isolate the Dashboard component
jest.mock('../../../components/WorkoutTableViewer', () => {
  const WorkoutTableViewer = () => <div data-testid="workout-table-viewer" />
  WorkoutTableViewer.displayName = 'WorkoutTableViewer'
  return WorkoutTableViewer
})
jest.mock('../../../components/GoogleDocViewer', () => {
  const GoogleDocViewer = () => <div data-testid="google-doc-viewer" />
  GoogleDocViewer.displayName = 'GoogleDocViewer'
  return GoogleDocViewer
})
jest.mock('../../../components/HrmConnectionPanel', () => {
  const HrmConnectionPanel = () => <div data-testid="hrm-connection-panel" />
  HrmConnectionPanel.displayName = 'HrmConnectionPanel'
  return HrmConnectionPanel
})
jest.mock('../../../components/TimerDisplay', () => {
  const TimerDisplay = () => <div data-testid="timer-display" />
  TimerDisplay.displayName = 'TimerDisplay'
  return TimerDisplay
})
jest.mock('../../../components/SpotifyDisplay', () => {
  const SpotifyDisplay = () => <div data-testid="spotify-display" />
  SpotifyDisplay.displayName = 'SpotifyDisplay'
  return SpotifyDisplay
})
jest.mock('../../../hooks/useAudio', () => ({
  useAudio: () => ({
    initializeAudio: jest.fn(),
  }),
}))

describe('Dashboard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <UserSettingsProvider>
        <WebSocketProvider>
          <WorkoutProvider>{ui}</WorkoutProvider>
        </WebSocketProvider>
      </UserSettingsProvider>
    )
  }

  it('renders GoogleDocViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is "false"', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'false'
    renderWithProvider(<DashboardContent />)
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-viewer')).not.toBeInTheDocument()
  })

  it('renders GoogleDocViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is not set', async () => {
    delete process.env.NEXT_PUBLIC_USE_NATIVE_TABLE
    renderWithProvider(<DashboardContent />)
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-viewer')).not.toBeInTheDocument()
  })

  it('renders WorkoutTableViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is "true"', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'true'
    renderWithProvider(<DashboardContent />)
    expect(
      await screen.findByTestId('workout-table-viewer')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('google-doc-viewer')).not.toBeInTheDocument()
  })
})
