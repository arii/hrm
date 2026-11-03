/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PlaylistDetails from '../../../../components/Spotify/PlaylistDetails'

// Mock the fetch API
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PlaylistDetails', () => {
  // Mirrors the real GET /api/spotify/playlists/[playlistId]/tracks payload:
  // artists/album are flattened strings, art arrives as albumArt.
  const mockTracks = [
    {
      id: '1',
      name: 'Track 1',
      uri: 'spotify:track:1',
      artists: 'Artist 1',
      album: 'Album 1',
      albumArt: 'http://example.com/art1.jpg',
      duration: 180000,
    },
    {
      id: '2',
      name: 'Track 2',
      uri: 'spotify:track:2',
      artists: 'Artist 2',
      album: null,
      albumArt: null,
      duration: 200000,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays a loading indicator while fetching data', async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ tracks: mockTracks }),
              }),
            100
          )
        )
    )

    render(
      <PlaylistDetails playlistId="test-playlist-id" onTrackPlay={jest.fn()} />
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull())
  })

  it('displays the track list and handles play clicks', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: mockTracks, total: 2 }),
    })
    const onTrackPlay = jest.fn()

    render(
      <PlaylistDetails
        playlistId="test-playlist-id"
        onTrackPlay={onTrackPlay}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Track 1')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Artist 1 - Album 1', { exact: false })
    ).toBeInTheDocument()
    expect(screen.getByText('Track 2')).toBeInTheDocument()
    expect(
      screen.getByText('Artist 2 - Unknown Album', { exact: false })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('Track 1'))
    expect(onTrackPlay).toHaveBeenCalledWith(0)
  })

  it('renders album art when available', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: mockTracks, total: 2 }),
    })

    const { container } = render(
      <PlaylistDetails playlistId="test-playlist-id" onTrackPlay={jest.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('Track 1')).toBeInTheDocument()
    })
    // Decorative art (alt="") is hidden from the a11y tree by design.
    const art = container.querySelector('img')
    expect(art).toHaveAttribute('src', 'http://example.com/art1.jpg')
  })

  it('passes an abort signal so navigation cancels in-flight fetches', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: mockTracks, total: 2 }),
    })

    render(
      <PlaylistDetails playlistId="test-playlist-id" onTrackPlay={jest.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('Track 1')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('displays an error message when the API call fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    })
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <PlaylistDetails playlistId="test-playlist-id" onTrackPlay={jest.fn()} />
    )
    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch playlist details')
      ).toBeInTheDocument()
    })
    consoleErrorSpy.mockRestore()
  })
})
