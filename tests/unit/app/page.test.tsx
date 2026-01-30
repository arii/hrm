/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboard from '../../../app/page'
import { WebSocketProvider } from '../../../context/WebSocketContext'

// Mock child components to isolate the Dashboard component
jest.mock('../../../components/WorkoutTableViewer', () => {
  const WorkoutTableViewer = ({ refreshKey }: { refreshKey: number }) => (
    <div data-testid="workout-table-viewer" data-refresh-key={refreshKey} />
  )
  WorkoutTableViewer.displayName = 'WorkoutTableViewer'
  return WorkoutTableViewer
})
jest.mock('../../../components/GoogleDocViewer', () => {
  const GoogleDocViewer = ({ refreshKey }: { refreshKey: number }) => (
    <div data-testid="google-doc-viewer" data-refresh-key={refreshKey} />
  )
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

jest.mock('../../../hooks/useBluetoothHRM', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    connect: jest.fn(),
  })),
}))

describe('Dashboard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('renders GoogleDocViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is "false"', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'false'
    render(
      <WebSocketProvider>
        <Dashboard />
      </WebSocketProvider>
    )
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-viewer')).not.toBeInTheDocument()
  })

  it('renders GoogleDocViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is not set', async () => {
    delete process.env.NEXT_PUBLIC_USE_NATIVE_TABLE
    render(
      <WebSocketProvider>
        <Dashboard />
      </WebSocketProvider>
    )
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-viewer')).not.toBeInTheDocument()
  })

  it('renders WorkoutTableViewer when NEXT_PUBLIC_USE_NATIVE_TABLE is "true"', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'true'
    render(
      <WebSocketProvider>
        <Dashboard />
      </WebSocketProvider>
    )
    expect(
      await screen.findByTestId('workout-table-viewer')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('google-doc-viewer')).not.toBeInTheDocument()
  })

  it('passes a new refreshKey to child components when refresh button is clicked', async () => {
    process.env.NEXT_PUBLIC_USE_NATIVE_TABLE = 'true'
    render(
      <WebSocketProvider>
        <Dashboard />
      </WebSocketProvider>
    )

    const workoutTableViewer = await screen.findByTestId('workout-table-viewer')
    const initialRefreshKey =
      workoutTableViewer.getAttribute('data-refresh-key')

    const refreshButton = screen.getByRole('button', {
      name: /refresh workout table/i,
    })
    fireEvent.click(refreshButton)

    const updatedWorkoutTableViewer = await screen.findByTestId(
      'workout-table-viewer'
    )
    const updatedRefreshKey =
      updatedWorkoutTableViewer.getAttribute('data-refresh-key')

    expect(updatedRefreshKey).not.toBe(initialRefreshKey)
    expect(parseInt(updatedRefreshKey as string)).toBe(
      parseInt(initialRefreshKey as string) + 1
    )
  })
})
