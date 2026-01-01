/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SpotifySelectionPage from '../../../../../app/client/spotify-selection/page'
import { Track } from '../../../../../types/spotify'

// Mock child components
jest.mock('../../../../../components/Spotify/PlaylistSelector', () => ({
  __esModule: true,
  default: ({ onPlaylistSelected }: { onPlaylistSelected: (uri: string) => void }) => (
    <button onClick={() => onPlaylistSelected('spotify:playlist:123')}>Select Playlist</button>
  ),
}))

jest.mock('../../../../../components/Spotify/PlaylistDetails', () => ({
  __esModule: true,
  default: ({ tracks, isLoading, error }: { tracks: Track[], isLoading: boolean, error: string | null }) => (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {tracks.map(track => <p key={track.id}>{track.name}</p>)}
    </div>
  ),
}))


// Mock context
jest.mock('../../../../../context/WebSocketContext', () => ({
  useWebSocket: () => ({
    spotifyData: { devices: [] },
    sendData: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('SpotifySelectionPage', () => {
  const mockTracks: Track[] = [{ id: '1', name: 'Track 1', artists: [], album: { name: 'Album 1' }, uri: 'uri'}]

  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('fetches and displays tracks when a playlist is selected', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: mockTracks }),
    })

    render(<SpotifySelectionPage />)

    fireEvent.click(await screen.findByText('Select Playlist'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/spotify/playlists/123/tracks')
    })

    await waitFor(() => {
        expect(screen.getByText('Track 1')).toBeInTheDocument()
    })
  })

  it('shows a loading state while fetching tracks', async () => {
    ;(fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({ tracks: mockTracks }) }), 100))
    )

    render(<SpotifySelectionPage />)

    fireEvent.click(screen.getByText('Select Playlist'))

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  it('displays an error message if fetching tracks fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Failed to fetch' }),
    })

    render(<SpotifySelectionPage />)

    fireEvent.click(screen.getByText('Select Playlist'))

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument()
    })
  })
})
