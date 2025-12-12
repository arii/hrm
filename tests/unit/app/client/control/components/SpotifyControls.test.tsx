// tests/unit/app/client/control/components/SpotifyControls.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { WebSocketContext } from '@/context/WebSocketContext'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('SpotifyControls', () => {
  const mockContextValue = {
    spotifyData: {
      trackName: 'Test Track',
      artist: 'Test Artist',
      isPlaying: true,
      devices: [],
      shuffleState: false,
      repeatState: 'off' as 'off',
    },
    connectionStatus: 'Connected',
    sendData: jest.fn(),
  }

  it('renders spotify controls when spotify data is available', () => {
    render(
      <WebSocketContext.Provider value={mockContextValue as any}>
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
