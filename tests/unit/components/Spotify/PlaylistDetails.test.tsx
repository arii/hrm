/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import PlaylistDetails from '@/components/Spotify/PlaylistDetails'
import { Track } from '@/types/spotify'

// Mock the fetch API
global.fetch = jest.fn()

describe('PlaylistDetails', () => {
  const mockTracks: Track[] = [
    {
      id: '1',
      name: 'Track 1',
      artists: [{ name: 'Artist 1' }],
      album: { name: 'Album 1' },
    },
    {
      id: '2',
      name: 'Track 2',
      artists: [{ name: 'Artist 2' }],
      album: { name: 'Album 2' },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays a loading indicator while fetching data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetch as any).mockImplementationOnce(
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

    render(<PlaylistDetails playlistId="test-playlist-id" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull())
  })

  it('displays the track list when data is fetched successfully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tracks: mockTracks }),
    })

    render(<PlaylistDetails playlistId="test-playlist-id" />)
    await waitFor(() => {
      expect(screen.getByText('Track 1')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Artist 1 - Album 1', { exact: false })
    ).toBeInTheDocument()
    expect(screen.getByText('Track 2')).toBeInTheDocument()
    expect(
      screen.getByText('Artist 2 - Album 2', { exact: false })
    ).toBeInTheDocument()
  })

  it('displays an error message when the API call fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
    })

    // Suppress console.error for this test
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(<PlaylistDetails playlistId="test-playlist-id" />)
    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch playlist details')
      ).toBeInTheDocument()
    })

    consoleErrorSpy.mockRestore()
  })
})
