/**
 * @jest-environment jsdom
 */
// tests/unit/components/Playlist/PlaylistTracksDisplay.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import PlaylistTracksDisplay from '@/components/Playlist/PlaylistTracksDisplay'
import { SpotifyDataContext } from '@/context/WebSocketContext'
import { SpotifyData } from '@/types/websocket'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn()

// Mock useSpotifyCommand
jest.mock('@/hooks/useSpotifyCommand')
const mockedUseSpotifyCommand = useSpotifyCommand as jest.MockedFunction<
  typeof useSpotifyCommand
>

describe('PlaylistTracksDisplay', () => {
  const executeMock = jest.fn()

  const mockHookValue = {
    execute: executeMock,
    activeDevice: null,
    hrmPlayer: null,
    playback: {
      track: {
        id: null,
        name: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      volume_percent: 0,
      isMuted: false,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSpotifyCommand.mockReturnValue(mockHookValue)
  })

  const mockSpotifyDataValue: SpotifyData = {
    devices: [],
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
      isMuted: false,
    },
  }

  const renderWithProviders = (
    spotifyData: SpotifyData = mockSpotifyDataValue
  ) =>
    render(
      <SpotifyDataContext.Provider value={spotifyData}>
        <PlaylistTracksDisplay playlistId="123" />
      </SpotifyDataContext.Provider>
    )

  it('should render loading state initially', () => {
    // Never-resolving fetch keeps the loading state with no dangling setState.
    ;(fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {}))
    renderWithProviders()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should render tracks and handle playing a track', async () => {
    const mockTracks = {
      tracks: [
        {
          id: 't1',
          name: 'Track 1',
          artists: 'Artist 1',
          duration: 180000,
          uri: 'spotify:track:t1',
          albumArt: null,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    })

    renderWithProviders()

    const playButton = await screen.findByRole('button', { name: /play/i })
    fireEvent.click(playButton)

    expect(executeMock).toHaveBeenCalledWith(
      'PLAY',
      expect.objectContaining({
        contextUri: 'spotify:playlist:123',
        offset: { position: 0 },
      })
    )
  })

  it('should handle pause when track is already playing', async () => {
    const mockTracks = {
      tracks: [
        {
          id: 't1',
          name: 'Track 1',
          artists: 'Artist 1',
          duration: 180000,
          uri: 'spotify:track:t1',
          albumArt: null,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    })

    const playingSpotifyData: SpotifyData = {
      ...mockSpotifyDataValue,
      playback: {
        ...mockSpotifyDataValue.playback,
        is_playing: true,
        track: { ...mockSpotifyDataValue.playback.track, id: 't1' },
      },
    }

    renderWithProviders(playingSpotifyData)

    const pauseButton = await screen.findByRole('button', { name: /pause/i })
    fireEvent.click(pauseButton)

    expect(executeMock).toHaveBeenCalledWith('PAUSE')
  })
})
