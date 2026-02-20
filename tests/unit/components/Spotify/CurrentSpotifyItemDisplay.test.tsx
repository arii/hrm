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
  spotifyData: {
    devices: [],
    isMuted: false,
    playback: {
      track: {
        id: null,
        name: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      volume_percent: 70,
      progress_ms: 0,
    },
    ...spotifyData,
  } as SpotifyData,
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
    const { container } = render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )
    const skeletons = container.querySelectorAll('.MuiSkeleton-root')
    expect(skeletons).toHaveLength(3)
  })

  it('renders empty state when nothing is playing', () => {
    const contextValue = mockWebSocketContext(
      {
        playback: {
          track: {
            id: null,
            name: null as unknown as string,
            artist: '',
            albumName: '',
            albumArtUrl: '',
          },
          is_playing: false,
          volume_percent: 0,
          progress_ms: 0,
        },
      },
      'Connected'
    )
    render(
      <WebSocketContext.Provider value={contextValue}>
        <CurrentSpotifyItemDisplay />
      </WebSocketContext.Provider>
    )

    expect(screen.getByText('Nothing playing on Spotify.')).toBeInTheDocument()
  })

  it('renders "Awaiting Login..." as empty state', () => {
    const contextValue = mockWebSocketContext(
      {
        playback: {
          track: {
            id: null,
            name: 'Awaiting Login...',
            artist: '',
            albumName: '',
            albumArtUrl: '',
          },
          is_playing: false,
          volume_percent: 0,
          progress_ms: 0,
        },
      },
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
      playback: {
        track: {
          name: 'Test Track',
          artist: 'Test Artist',
          albumName: 'Test Album',
          albumArtUrl: 'http://example.com/art.jpg',
        },
      },
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
      playback: {
        track: {
          name: 'Test Track',
          artist: 'Test Artist',
          albumName: 'Test Album',
          albumArtUrl: null,
        },
      },
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
    const spotifyData: Partial<SpotifyData> = {
      playback: {
        track: {
          id: null,
          name: 'Test Track',
          artist: '',
          albumName: '',
          albumArtUrl: '',
        },
        is_playing: false,
        volume_percent: 0,
        progress_ms: 0,
      },
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
    const spotifyData: Partial<SpotifyData> = {
      playback: {
        track: {
          id: null,
          name: 'Test Track',
          artist: '',
          albumName: '',
          albumArtUrl: '',
        },
        is_playing: false,
        volume_percent: 0,
        progress_ms: 0,
      },
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
