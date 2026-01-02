/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react'
import PlaylistTracksDisplay from '@/components/Playlist/PlaylistTracksDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { formatDuration } from '@/utils/formatters'

// Mock fetch
global.fetch = jest.fn()

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

// Mock AutoSizer
jest.mock('react-virtualized-auto-sizer', () => {
  return {
    __esModule: true,
    default: ({
      children,
    }: {
      children: (size: { height: number; width: number }) => React.ReactElement
    }) => {
      return children({ height: 600, width: 800 })
    },
  }
})

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

  it('should render error state on initial fetch fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))
    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to fetch'
    )
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
    expect(
      await screen.findByText('This playlist is empty.')
    ).toBeInTheDocument()
  })

  it('should render tracks and load more on scroll', async () => {
    const mockTracksPage1 = {
      tracks: Array.from({ length: 50 }, (_, i) => ({
        id: `t${i + 1}`,
        name: `Track ${i + 1}`,
        artists: `Artist ${i + 1}`,
        duration: 180000,
        uri: `spotify:track:t${i + 1}`,
      })),
      total: 100,
    }

    const mockTracksPage2 = {
      tracks: Array.from({ length: 50 }, (_, i) => ({
        id: `t${i + 51}`,
        name: `Track ${i + 51}`,
        artists: `Artist ${i + 51}`,
        duration: 180000,
        uri: `spotify:track:t${i + 51}`,
      })),
      total: 100,
    }

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTracksPage1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTracksPage2,
      })

    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )

    // Wait for the first page of tracks to render
    expect(await screen.findByText('Track 1')).toBeInTheDocument()
    expect(screen.getByText('Artist 1')).toBeInTheDocument()
    expect(screen.getAllByText(formatDuration(180000))).not.toHaveLength(0)

    // Trigger the intersection observer
    act(() => {
      const call = mockIntersectionObserver.mock.calls[0]
      if (call) {
        const [callback] = call
        callback([{ isIntersecting: true }])
      }
    })

    await screen.findByText('Track 51')

    // We will verify that the second fetch was called, which indicates that the infinite loader is working.
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('should render error state on load more fail', async () => {
    const mockTracksPage1 = {
      tracks: Array.from({ length: 50 }, (_, i) => ({
        id: `t${i + 1}`,
        name: `Track ${i + 1}`,
        artists: `Artist ${i + 1}`,
        duration: 180000,
        uri: `spotify:track:t${i + 1}`,
      })),
      total: 100,
    }

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTracksPage1,
      })
      .mockRejectedValueOnce(new Error('Failed to fetch more tracks'))

    render(
      <WebSocketContext.Provider value={mockContextValue}>
        <PlaylistTracksDisplay playlistId="123" />
      </WebSocketContext.Provider>
    )

    // Wait for the first page of tracks to render
    expect(await screen.findByText('Track 1')).toBeInTheDocument()

    // Trigger the intersection observer
    act(() => {
      const [call] = mockIntersectionObserver.mock.calls as [
        [(entries: IntersectionObserverEntry[]) => void, Element],
      ]
      const [callback] = call
      callback([{ isIntersecting: true } as IntersectionObserverEntry])
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to fetch more tracks'
    )
  })
})
