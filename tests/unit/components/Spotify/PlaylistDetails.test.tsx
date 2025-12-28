/** @jest-environment jsdom */
// tests/unit/components/Spotify/PlaylistDetails.test.tsx
import { render, screen } from '@testing-library/react'
import PlaylistDetails from '@/components/Spotify/PlaylistDetails'
import { usePlaylistDetails } from '@/hooks/usePlaylistDetails'

jest.mock('@/hooks/usePlaylistDetails')

describe('PlaylistDetails', () => {
  it('should display a loading skeleton while fetching data', () => {
    ;(usePlaylistDetails as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    })
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:123"
        onBack={() => {}}
        onPlaylistPlay={() => {}}
      />
    )
    expect(screen.getAllByRole('list')).toHaveLength(1)
  })

  it('should display playlist details after a successful fetch', async () => {
    ;(usePlaylistDetails as jest.Mock).mockReturnValue({
      data: {
        name: 'Test Playlist',
        description: 'Test Description',
        imageUrl: 'http://example.com/image.jpg',
        tracks: [{ name: 'Test Track', artist: 'Test Artist', duration: 60000 }],
      },
      loading: false,
      error: null,
    })
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:123"
        onBack={() => {}}
        onPlaylistPlay={() => {}}
      />
    )
    expect(screen.getByText('Test Playlist')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('1. Test Track')).toBeInTheDocument()
  })

  it('should display an error message if the fetch fails', () => {
    ;(usePlaylistDetails as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch playlist',
    })
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:123"
        onBack={() => {}}
        onPlaylistPlay={() => {}}
      />
    )
    expect(screen.getByText('Failed to fetch playlist')).toBeInTheDocument()
  })
})
