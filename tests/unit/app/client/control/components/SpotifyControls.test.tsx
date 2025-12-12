// tests/unit/app/client/control/components/SpotifyControls.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { WebSocketContext } from '@/context/WebSocketContext'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { SpotifyData } from '@/types/websocket'

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('SpotifyControls', () => {
  const mockSpotifyData: SpotifyData = {
    trackName: 'Test Track',
    artist: 'Test Artist',
    isPlaying: true,
    devices: [],
    shuffleState: false,
    repeatState: 'off',
  }

  const mockContextValue = {
    spotifyData: mockSpotifyData,
    connectionStatus: 'Connected',
    sendData: jest.fn(),
  }

  it('renders spotify controls when spotify data is available', () => {
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <SpotifyControls />
      </WebSocketContext.Provider>
    )

    // The SpotifyControls component now renders the PlaybackControls component.
    // We can check for the presence of the main control card.
    expect(screen.getByTestId('spotify-controls-card')).toBeInTheDocument()

    // And we can also check for a specific button inside the PlaybackControls component
    expect(screen.getByTestId('spotify-play-pause')).toBeInTheDocument()
  })
})
