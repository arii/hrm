/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import ClientDashboard from '../../../app/page.client'

// Mock child components to isolate the Dashboard component
jest.mock('../../../components/WorkoutTableViewer', () => {
  const WorkoutTableViewer = () => <div data-testid="workout-table-viewer" />
  WorkoutTableViewer.displayName = 'WorkoutTableViewer'
  return WorkoutTableViewer
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
jest.mock('../../../components/GoogleDocViewer', () => {
  const GoogleDocViewer = () => <div data-testid="google-doc-viewer" />
  GoogleDocViewer.displayName = 'GoogleDocViewer'
  return GoogleDocViewer
})
jest.mock('../../../hooks/useAudio', () => ({
  useAudio: () => ({
    initializeAudio: jest.fn(),
  }),
}))

const mockTableDocUrl =
  'https://docs.google.com/document/d/1aLn_N1UheWVFKSVQtfBkgQbVDvHNbjVSH9ie3o_trYo/edit?usp=sharing'
const mockIframeUrl =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

describe('ClientDashboard', () => {
  describe('Table mode (default)', () => {
    it('renders WorkoutTableViewer', async () => {
      render(<ClientDashboard tableDocUrl={mockTableDocUrl} />)
      expect(
        await screen.findByTestId('workout-table-viewer')
      ).toBeInTheDocument()
    })

    it('renders HrmConnectionPanel', async () => {
      render(<ClientDashboard tableDocUrl={mockTableDocUrl} />)
      expect(
        await screen.findByTestId('hrm-connection-panel')
      ).toBeInTheDocument()
    })

    it('renders TimerDisplay', async () => {
      render(<ClientDashboard tableDocUrl={mockTableDocUrl} />)
      expect(await screen.findByTestId('timer-display')).toBeInTheDocument()
    })

    it('renders SpotifyDisplay', async () => {
      render(<ClientDashboard tableDocUrl={mockTableDocUrl} />)
      expect(await screen.findByTestId('spotify-display')).toBeInTheDocument()
    })
  })

  describe('Iframe mode', () => {
    it('renders GoogleDocViewer when useIframe is true', async () => {
      render(
        <ClientDashboard
          tableDocUrl={mockTableDocUrl}
          iframeUrl={mockIframeUrl}
          useIframe={true}
        />
      )
      expect(await screen.findByTestId('google-doc-viewer')).toBeInTheDocument()
      expect(
        screen.queryByTestId('workout-table-viewer')
      ).not.toBeInTheDocument()
    })

    it('renders WorkoutTableViewer when useIframe is false', async () => {
      render(
        <ClientDashboard
          tableDocUrl={mockTableDocUrl}
          iframeUrl={mockIframeUrl}
          useIframe={false}
        />
      )
      expect(
        await screen.findByTestId('workout-table-viewer')
      ).toBeInTheDocument()
      expect(screen.queryByTestId('google-doc-viewer')).not.toBeInTheDocument()
    })
  })
})
