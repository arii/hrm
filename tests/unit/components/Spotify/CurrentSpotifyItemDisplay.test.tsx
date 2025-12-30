/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import CurrentSpotifyItemDisplay from '@/components/Spotify/CurrentSpotifyItemDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { WebSocketContextType, SpotifyData } from '@/types/websocket'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

// Mock the useSpotifyWebPlayback hook
jest.mock('@/hooks/useSpotifyWebPlayback')

const mockedUseSpotifyWebPlayback = useSpotifyWebPlayback as jest.Mock

// Mock the WebSocketContext
const mockWebSocketContext = (
  spotifyData: Partial<SpotifyData>,
  connectionStatus: 'Connecting' | 'Connected' | 'Disconnected'
): WebSocketContextType => ({
  spotifyData: spotifyData as SpotifyData,
  connectionStatus,
  sendData: jest.fn(),
  timerData: {
    isRunning: false,
    phase: 'IDLE',
    timeRemaining: 0,
    totalTime: 0,
  },
  hrmData: {},
  appState: {
    timer: {
      isRunning: false,
      phase: 'IDLE',
      timeRemaining: 0,
      totalTime: 0,
    },
    spotify: spotifyData,
    hrm: {},
  },
})

describe('CurrentSpotifyItemDisplay', () => {
  beforeEach(() => {
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isReady: false,
      deviceId: null,
      isAuthenticated: false,
    })
  })

  it('renders loading skeletons when connecting', () => {
    const contextValue = mockWebSocketContext({}, 'Connecting')
    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )
    const skeletons = screen.getByTestId('loading-skeletons')
    expect(skeletons).toBeInTheDocument()
  })

  it('renders empty state when nothing is playing', () => {
    const contextValue = mockWebSocketContext({ trackName: null }, 'Connected')
    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )

    expect(screen.getByText('Nothing playing on Spotify.')).toBeInTheDocument()
  })

  it('renders "Awaiting Login..." as empty state', () => {
    const contextValue = mockWebSocketContext(
      { trackName: 'Awaiting Login...' },
      'Connected'
    )
    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )

    expect(screen.getByText('Nothing playing on Spotify.')).toBeInTheDocument()
  })

  it('renders track information when data is available', () => {
    const spotifyData = {
      trackName: 'Test Track',
      artist: 'Test Artist',
      albumName: 'Test Album',
      albumArtUrl: 'http://example.com/art.jpg',
    }
    const contextValue = mockWebSocketContext(spotifyData, 'Connected')

    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )

    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByText('Test Album')).toBeInTheDocument()
    const albumArt = screen.getByAltText('Test Album')
    expect(albumArt).toBeInTheDocument()
    expect(albumArt.src).toContain('http%3A%2F%2Fexample.com%2Fart.jpg')
  })

  it('renders a placeholder when album art is missing', () => {
    const spotifyData = {
      trackName: 'Test Track',
      artist: 'Test Artist',
      albumName: 'Test Album',
      albumArtUrl: null,
    }
    const contextValue = mockWebSocketContext(spotifyData, 'Connected')

    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )

    expect(screen.queryByAltText('Test Album')).not.toBeInTheDocument()
  })

  it('renders connecting player message', () => {
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isReady: false,
      deviceId: null,
      isAuthenticated: true,
    })
    const spotifyData = {
      trackName: 'Test Track',
    }
    const contextValue = mockWebSocketContext(spotifyData, 'Connected')
    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )
    expect(screen.getByText('🔄 Connecting Player...')).toBeInTheDocument()
  })

  it('renders browser player active message', () => {
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isReady: true,
      deviceId: 'test-device',
      isAuthenticated: true,
    })
    const spotifyData = {
      trackName: 'Test Track',
    }
    const contextValue = mockWebSocketContext(spotifyData, 'Connected')
    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )
    expect(screen.getByText('🎵 Browser Player Active')).toBeInTheDocument()
  })
})
