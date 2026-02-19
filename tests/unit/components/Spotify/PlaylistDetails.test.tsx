/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PlaylistDetails from '@/components/Spotify/PlaylistDetails'
import { SpotifyPlaylistItem as Track } from '@/types/core'

// Mock the fetch API
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PlaylistDetails', () => {
  const mockTracksAsArray: Track[] = [
    {
      id: '1',
      name: 'Track 1',
      uri: 'spotify:track:1',
      artists: [{ name: 'Artist 1' }],
      album: { name: 'Album 1' },
      imageUrl: '',
    },
    {
      id: '2',
      name: 'Track 2',
      uri: 'spotify:track:2',
      artists: [{ name: 'Artist 2' }],
      album: { name: 'Album 2' },
      imageUrl: '',
    },
  ]

  const mockTracksAsString = mockTracksAsArray.map((track) => ({
    ...track,
    artists: track.artists.map((a) => a.name).join(', '),
  })) as unknown as Track[]

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
                json: () => Promise.resolve({ tracks: mockTracksAsArray }),
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

  it('displays the track list and handles play clicks when artists is an array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: mockTracksAsArray }),
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
      screen.getByText('Artist 2 - Album 2', { exact: false })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('Track 1'))
    expect(onTrackPlay).toHaveBeenCalledWith('spotify:track:1')
  })

  it('displays the track list and handles play clicks when artists is a string', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tracks: mockTracksAsString, total: 2 }),
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
      screen.getByText('Artist 2 - Album 2', { exact: false })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('Track 1'))
    expect(onTrackPlay).toHaveBeenCalledWith('spotify:track:1')
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
