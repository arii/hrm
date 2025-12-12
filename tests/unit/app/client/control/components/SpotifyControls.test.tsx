/** @jest-environment jsdom */

import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { useWebSocket } from '@/context/WebSocketContext'
import type { SpotifyData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

type UseWebSocketReturn = ReturnType<typeof useWebSocket>

jest.mock('@/context/WebSocketContext')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  () => UseWebSocketReturn
>

const baseSpotifyData: SpotifyData = {
  trackName: 'Mock Track',
  artist: 'Mock Artist',
  isPlaying: true,
  devices: [],
}

describe('SpotifyControls', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the PlaybackControls component when a track is playing', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: baseSpotifyData,
      connectionStatus: 'Connected',
      sendData: jest.fn(),
    } as unknown as UseWebSocketReturn)

    render(<SpotifyControls />)

    // The PlaybackControls component contains a button with the test id "spotify-play-pause"
    expect(screen.getByTestId('spotify-play-pause')).toBeInTheDocument()
  })
})
