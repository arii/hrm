/**
 * @jest-environment jsdom
 */
// tests/unit/components/Playlist/PlaylistTracksDisplay.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import PlaylistTracksDisplay from '@/components/Playlist/PlaylistTracksDisplay'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSpotifyCommand.mockReturnValue({
      execute: executeMock,
      activeDevice: null,
      hrmPlayer: null,
      playback: {},
      isHrmPlayerActive: false,
    } as unknown as ReturnType<typeof useSpotifyCommand>)
  })

  const mockContextValue = {
    spotifyData: {
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
    },
    sendData: jest.fn(),
    connectionStatus: 'Connected',
    timerData: {},
    hrmData: [],
    activeAlerts: [],
    connect: jest.fn(),
    disconnect: jest.fn(),
  }

  it('should render loading state initially', () => {
    render(
      <WebSocketContext.Provider
        value={mockContextValue as unknown as WebSocketContextType}
      >
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
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

    render(
      <WebSocketContext.Provider
        value={mockContextValue as unknown as WebSocketContextType}
      >
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )

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

    const playingContextValue = {
      ...mockContextValue,
      spotifyData: {
        ...mockContextValue.spotifyData,
        playback: {
          ...mockContextValue.spotifyData.playback,
          is_playing: true,
          track: { ...mockContextValue.spotifyData.playback.track, id: 't1' },
        },
      },
    }

    render(
      <WebSocketContext.Provider
        value={playingContextValue as unknown as WebSocketContextType}
      >
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )

    const pauseButton = await screen.findByRole('button', { name: /pause/i })
    fireEvent.click(pauseButton)

    expect(executeMock).toHaveBeenCalledWith('PAUSE')
  })
})
