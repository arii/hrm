/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import Dashboard from '../../../app/page'

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
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('renders GoogleDocViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is "false"', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'false'
    render(<Dashboard />)
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-viewer')).not.toBeInTheDocument()
  })

  it('renders GoogleDocViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is not set', async () => {
    delete process.env.NEXT_PUBLIC_USE_NATIVE_TABLE
    render(<Dashboard />)
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-viewer')).not.toBeInTheDocument()
  })

  it('renders WorkoutTableViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is "true"', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'true'
    render(<Dashboard />)
    expect(
      await screen.findByTestId('workout-table-viewer')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('google-doc-viewer')).not.toBeInTheDocument()
  })
})
