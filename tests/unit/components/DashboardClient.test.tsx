/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import DashboardClient from '@/components/DashboardClient'
import { HrmDataContext } from '@/context/WebSocketContext'
import { mockHrmData } from '../../fixtures/hrm'

// Mock child components to isolate the DashboardClient component
jest.mock('@/components/WorkoutPhaseGrid', () => {
  const WorkoutPhaseGrid = ({
    docId,
    refreshKey,
    onRefresh,
  }: {
    docId: string
    refreshKey: number
    onRefresh?: () => void
  }) => (
    <div
      data-testid="workout-phase-grid"
      data-doc-id={docId}
      data-refresh-key={refreshKey}
    >
      <button aria-label="refresh workout table" onClick={onRefresh} />
    </div>
  )
  WorkoutPhaseGrid.displayName = 'WorkoutPhaseGrid'
  return WorkoutPhaseGrid
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

describe('DashboardClient', () => {
  const mockProps = {
    docId: 'mock-doc-id',
  }

  it('always renders the native WorkoutPhaseGrid with the doc id', async () => {
    render(<DashboardClient {...mockProps} />)
    const grid = await screen.findByTestId('workout-phase-grid')
    expect(grid).toBeInTheDocument()
    expect(grid.getAttribute('data-doc-id')).toBe('mock-doc-id')
    // No iframe fallback exists anymore.
    expect(
      document.querySelector('iframe[title="Today\'s Training Regimen"]')
    ).not.toBeInTheDocument()
  })

  it('passes a new refreshKey to WorkoutPhaseGrid when refresh button is clicked', async () => {
    render(<DashboardClient {...mockProps} />)

    const workoutTableHeader = await screen.findByTestId('workout-phase-grid')
    const initialRefreshKey =
      workoutTableHeader.getAttribute('data-refresh-key')

    const refreshButton = screen.getByRole('button', {
      name: /refresh workout table/i,
    })
    fireEvent.click(refreshButton)

    const updatedWorkoutPhaseGrid =
      await screen.findByTestId('workout-phase-grid')
    const updatedRefreshKey =
      updatedWorkoutPhaseGrid.getAttribute('data-refresh-key')

    expect(updatedRefreshKey).not.toBe(initialRefreshKey)
    expect(parseInt(updatedRefreshKey as string)).toBe(
      parseInt(initialRefreshKey as string) + 1
    )
  })

  it('renders an Alert when the Google Doc ID is missing', async () => {
    render(<DashboardClient />)
    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(
      'Google Doc ID not found. Please check GOOGLE_DOC_WORKOUT_URL.'
    )
    expect(screen.queryByTestId('workout-phase-grid')).not.toBeInTheDocument()
  })

  it('hides the HR panel when no HR clients are connected', async () => {
    render(
      <HrmDataContext.Provider value={[]}>
        <DashboardClient {...mockProps} />
      </HrmDataContext.Provider>
    )
    expect(await screen.findByTestId('workout-phase-grid')).toBeInTheDocument()
    // Nothing to clip inside the locked top-row height.
    expect(screen.queryByTestId('hrm-connection-panel')).not.toBeInTheDocument()
  })

  it('shows the HR panel when HR clients are connected', async () => {
    render(
      <HrmDataContext.Provider value={mockHrmData}>
        <DashboardClient {...mockProps} />
      </HrmDataContext.Provider>
    )
    expect(
      await screen.findByTestId('hrm-connection-panel')
    ).toBeInTheDocument()
  })
})
