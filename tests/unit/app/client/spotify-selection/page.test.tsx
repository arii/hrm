/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import SpotifySelectionPage from '@/app/client/spotify-selection/page'
import { useWebSocket, WebSocketContextType } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock the dependencies
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyCommand')
jest.mock('next/dynamic', () => () => {
  const MockComponent = ({
    onPlaylistSelected,
    onPlaylistPlay,
  }: {
    onPlaylistSelected: (uri: string) => void
    onPlaylistPlay: (uri: string) => void
  }) => (
    <div data-testid="mock-playlist-selector">
      <button onClick={() => onPlaylistSelected('spotify:playlist:mock1')}>
        Select
      </button>
      <button onClick={() => onPlaylistPlay('spotify:playlist:mock1')}>
        Play
      </button>
    </div>
  )
  MockComponent.displayName = 'MockPlaylistSelector'
  return MockComponent
})

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSpotifyCommand = useSpotifyCommand as jest.MockedFunction<
  typeof useSpotifyCommand
>

describe('SpotifySelectionPage', () => {
  const executeMock = jest.fn()

  const mockHookValue = {
    execute: executeMock,
    activeDevice: null,
    hrmPlayer: null,
    playback: {
      track: { id: null, name: '', artist: '', albumName: '', albumArtUrl: '' },
      is_playing: false,
      volume_percent: 0,
      isMuted: false,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  }

  const mockContextValue: Partial<WebSocketContextType> = {
    spotifyData: {
      devices: [],
      playback: {
        track: {
          id: null,
          name: 'Awaiting Login...',
          artist: '',
          albumName: '',
          albumArtUrl: '',
        },
        is_playing: false,
        volume_percent: 70,
        progress_ms: 0,
        isMuted: false,
      },
    },
    connectionStatus: 'Connected',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseWebSocket.mockReturnValue(mockContextValue)
    mockedUseSpotifyCommand.mockReturnValue(mockHookValue)
  })

  it('renders login prompt when not logged in', () => {
    render(<SpotifySelectionPage />)
    expect(
      screen.getByText(/Login to Spotify on the main dashboard/i)
    ).toBeInTheDocument()
  })

  it('renders now playing when logged in', () => {
    mockedUseWebSocket.mockReturnValue({
      ...mockContextValue,
      spotifyData: {
        ...mockContextValue.spotifyData,
        playback: {
          ...mockContextValue.spotifyData?.playback,
          track: {
            id: 't1',
            name: 'Song 1',
            artist: 'Artist 1',
            albumName: '',
            albumArtUrl: '',
          },
        },
      },
    })
    render(<SpotifySelectionPage />)
    expect(screen.getByText('Song 1 - Artist 1')).toBeInTheDocument()
  })

  it('dispatches PLAY command when a playlist is played', async () => {
    render(<SpotifySelectionPage />)
    const playButton = screen.getByText('Play')
    fireEvent.click(playButton)

    expect(executeMock).toHaveBeenCalledWith('PLAY', {
      playlistUri: 'spotify:playlist:mock1',
    })
  })
})
