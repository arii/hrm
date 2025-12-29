/**
 * @jest-environment jsdom
 */
// tests/unit/components/Playlist/PlaylistTracksDisplay.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlaylistTracksDisplay from '@/components/Playlist/PlaylistTracksDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { formatDuration } from '@/utils/formatters'

// Mock fetch at the module level
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PlaylistTracksDisplay', () => {
  const mockContextValue = {
    spotifyData: { isPlaying: false, trackId: null },
    sendData: jest.fn(),
    connectionStatus: 'Connected',
    timerData: {},
    hrmData: {},
    lastMessage: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }

  beforeEach(() => {
    // Clear mock history before each test
    mockFetch.mockClear()
    jest.clearAllMocks()
  })

  it('should render loading state initially', async () => {
    // Mock a pending promise
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should render error state on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch tracks'))
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    // `findByRole` waits for the element to appear
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Failed to fetch tracks')
  })

  it('should render empty state when no tracks are returned', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [], total: 0 }),
    })
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    expect(
      await screen.findByText('This playlist is empty.')
    ).toBeInTheDocument()
  })

  it('should render tracks and handle pagination', async () => {
    const mockTracksPage1 = {
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
      total: 25,
    }
    const mockTracksPage2 = {
      tracks: [
        {
          id: 't2',
          name: 'Track 2',
          artists: 'Artist 2',
          duration: 240000,
          uri: 'spotify:track:t2',
          albumArt: null,
        },
      ],
      total: 25,
    }

    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracksPage1,
    })

    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )

    // Verify initial tracks are rendered
    expect(await screen.findByText('Track 1')).toBeInTheDocument()
    expect(screen.getByText('Artist 1')).toBeInTheDocument()
    expect(screen.getByText(formatDuration(180000))).toBeInTheDocument()
    expect(screen.getByText('Showing 1-20 of 25')).toBeInTheDocument()

    // Mock fetch for the next page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracksPage2,
    })

    // Test pagination
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)

    // Wait for the new track to appear
    expect(await screen.findByText('Track 2')).toBeInTheDocument()
    expect(screen.getByText('Artist 2')).toBeInTheDocument()
    expect(screen.getByText(formatDuration(240000))).toBeInTheDocument()
    expect(screen.getByText('Showing 21-25 of 25')).toBeInTheDocument()

    // Verify fetch was called with the correct offset
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/spotify/playlists/123/tracks?limit=20&offset=20'
      )
    })
  })
})
