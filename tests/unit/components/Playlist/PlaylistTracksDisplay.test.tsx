/**
 * @jest-environment jsdom
 */
// tests/unit/components/Playlist/PlaylistTracksDisplay.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlaylistTracksDisplay from '@/components/Playlist/PlaylistTracksDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { formatDuration } from '@/utils/formatters'

// Mock fetch
global.fetch = jest.fn()

describe('PlaylistTracksDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockContextValue = {
    spotifyData: { isPlaying: false, trackUri: '' },
    sendData: jest.fn(),
    connectionStatus: 'Connected',
    timerData: {},
    hrmData: {},
    lastMessage: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }

  it('should render loading state initially', () => {
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should render error state', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch')
  })

  it('should render empty state', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [], total: 0 }),
    })
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
    expect(screen.getByText('This playlist is empty.')).toBeInTheDocument()
  })

  it('should render tracks and handle pagination', async () => {
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
      total: 25,
      limit: 20,
      offset: 0,
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    })

    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Track 1')).toBeInTheDocument()
    expect(screen.getByText('Artist 1')).toBeInTheDocument()
    expect(screen.getByText(formatDuration(180000))).toBeInTheDocument()

    // Test pagination
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)
    expect(fetch).toHaveBeenCalledWith(
      '/api/spotify/playlists/123/tracks?limit=20&offset=20'
    )
  })
})
