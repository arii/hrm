/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import DashboardClient from '@/components/DashboardClient'

// Mock child components to isolate the DashboardClient component
jest.mock('@/components/WorkoutTableHeader', () => {
  const WorkoutTableHeader = ({
    refreshKey,
    onRefresh,
  }: {
    refreshKey: number
    onRefresh?: () => void
  }) => (
    <div data-testid="workout-table-header" data-refresh-key={refreshKey}>
      <button aria-label="refresh workout table" onClick={onRefresh} />
    </div>
  )
  WorkoutTableHeader.displayName = 'WorkoutTableHeader'
  return WorkoutTableHeader
})
jest.mock('@/components/GoogleDocViewer', () => {
  const GoogleDocViewer = ({
    refreshKey,
    onRefresh,
  }: {
    refreshKey: number
    onRefresh?: () => void
  }) => (
    <div data-testid="google-doc-viewer" data-refresh-key={refreshKey}>
      <button aria-label="refresh workout table" onClick={onRefresh} />
    </div>
  )
  GoogleDocViewer.displayName = 'GoogleDocViewer'
  return GoogleDocViewer
})
jest.mock('@/components/HrmConnectionPanel', () => {
  const HrmConnectionPanel = () => <div data-testid="hrm-connection-panel" />
  HrmConnectionPanel.displayName = 'HrmConnectionPanel'
  return HrmConnectionPanel
})
jest.mock('@/components/TimerDisplay', () => {
  const TimerDisplay = () => <div data-testid="timer-display" />
  TimerDisplay.displayName = 'TimerDisplay'
  return TimerDisplay
})
jest.mock('@/components/SpotifyDisplay', () => {
  const SpotifyDisplay = () => <div data-testid="spotify-display" />
  SpotifyDisplay.displayName = 'SpotifyDisplay'
  return SpotifyDisplay
})
jest.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    initializeAudio: jest.fn(),
  }),
}))

describe('DashboardClient', () => {
  const mockProps = {
    workoutDocUrl: 'https://docs.google.com/document/d/mock-doc-id/edit',
    workoutDocIframeUrl:
      'https://docs.google.com/document/d/e/mock-iframe-id/pub?embedded=true',
  }

  it('renders GoogleDocViewer when useNativeTable is false', async () => {
    render(<DashboardClient useNativeTable={false} {...mockProps} />)
    expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-table-header')).not.toBeInTheDocument()
  })

  it('renders WorkoutTableHeader when useNativeTable is true', async () => {
    render(<DashboardClient useNativeTable={true} {...mockProps} />)
    expect(
      await screen.findByTestId('workout-table-header')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('google-doc-viewer')).not.toBeInTheDocument()
  })

  it('passes a new refreshKey to child components when refresh button is clicked', async () => {
    render(<DashboardClient useNativeTable={true} {...mockProps} />)

    const workoutTableHeader = await screen.findByTestId('workout-table-header')
    const initialRefreshKey =
      workoutTableHeader.getAttribute('data-refresh-key')

    const refreshButton = screen.getByRole('button', {
      name: /refresh workout table/i,
    })
    fireEvent.click(refreshButton)

    const updatedWorkoutTableHeader = await screen.findByTestId(
      'workout-table-header'
    )
    const updatedRefreshKey =
      updatedWorkoutTableHeader.getAttribute('data-refresh-key')

    expect(updatedRefreshKey).not.toBe(initialRefreshKey)
    expect(parseInt(updatedRefreshKey as string)).toBe(
      parseInt(initialRefreshKey as string) + 1
    )
  })

  it('passes a new refreshKey to GoogleDocViewer when refresh button is clicked', async () => {
    render(<DashboardClient useNativeTable={false} {...mockProps} />)

    const googleDocViewer = await screen.findByTestId('google-doc-viewer')
    const initialRefreshKey = googleDocViewer.getAttribute('data-refresh-key')

    const refreshButton = screen.getByRole('button', {
      name: /refresh workout table/i,
    })
    fireEvent.click(refreshButton)

    const updatedGoogleDocViewer =
      await screen.findByTestId('google-doc-viewer')
    const updatedRefreshKey =
      updatedGoogleDocViewer.getAttribute('data-refresh-key')

    expect(updatedRefreshKey).not.toBe(initialRefreshKey)
    expect(parseInt(updatedRefreshKey as string)).toBe(
      parseInt(initialRefreshKey as string) + 1
    )
  })
})
