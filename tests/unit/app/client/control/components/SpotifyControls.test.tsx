// tests/unit/app/client/control/components/SpotifyControls.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { SpotifyData } from '@/types/websocket'
import React from 'react'

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('@/hooks/useVolumePreference', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    volume: 50,
    setVolume: jest.fn(),
  })),
}))

jest.mock('@/hooks/useSpotifyControls', () => ({
  useSpotifyControls: () => ({
    sendCommand: jest.fn(),
  }),
}))

// Mock the WebSocketProvider to avoid issues with localStorage and WebSocket in tests
jest.mock('@/context/WebSocketContext', () => ({
  ...jest.requireActual('@/context/WebSocketContext'),
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useWebSocket: jest.fn(),
}))

import { useWebSocket } from '@/context/WebSocketContext'

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

  beforeEach(() => {
    ;(useWebSocket as jest.Mock).mockReturnValue(mockContextValue)
  })

  // Mock document object to prevent "document is not defined" error
  const originalDocument = global.document
  beforeAll(() => {
    global.document = {
      ...originalDocument,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  })

  afterAll(() => {
    global.document = originalDocument
  })

  it('renders spotify controls when spotify data is available', () => {
    render(<SpotifyControls />)

    // The SpotifyControls component now renders the PlaybackControls component.
    // We can check for the presence of the main control card.
    expect(screen.getByTestId('spotify-controls-card')).toBeInTheDocument()

    // And we can also check for a specific button inside the PlaybackControls component
    expect(screen.getByTestId('spotify-play-pause')).toBeInTheDocument()
  })
})
