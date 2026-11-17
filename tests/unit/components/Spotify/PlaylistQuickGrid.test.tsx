/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PlaylistQuickGrid from '@/components/Spotify/PlaylistQuickGrid'

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

const playlists = {
  presetPlaylists: [{ name: 'Workout', uri: 'spotify:playlist:workout' }],
  userPlaylists: [
    {
      name: 'Leg Day',
      uri: 'spotify:playlist:legday',
      trackCount: 12,
      owner: 'Ari',
    },
  ],
}

const respond = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)

describe('PlaylistQuickGrid', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: RequestInfo | URL) =>
      String(url).includes('/search')
        ? respond({
            items: [
              { name: 'Leg Day', uri: 'spotify:playlist:legday' },
              { name: 'Legends', uri: 'spotify:playlist:legends' },
            ],
          })
        : respond(playlists)
    ) as jest.Mock
  })

  const renderGrid = () => {
    const onPlaylistPlay = jest.fn()
    const onShowTracks = jest.fn()
    render(
      <PlaylistQuickGrid
        onPlaylistPlay={onPlaylistPlay}
        onShowTracks={onShowTracks}
      />
    )
    return { onPlaylistPlay, onShowTracks }
  }

  it('shows presets and the user playlists as tiles', async () => {
    renderGrid()
    expect(
      await screen.findByRole('button', { name: 'Play playlist: Workout' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Play playlist: Leg Day' })
    ).toBeInTheDocument()
    expect(screen.getByText('12 tracks · Ari')).toBeInTheDocument()
  })

  it('plays the whole playlist on one tap', async () => {
    const { onPlaylistPlay, onShowTracks } = renderGrid()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Play playlist: Leg Day' })
    )
    expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:legday')
    expect(onShowTracks).not.toHaveBeenCalled()
  })

  it('opens the track list from the Tracks button without playing', async () => {
    const { onPlaylistPlay, onShowTracks } = renderGrid()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Show tracks: Workout' })
    )
    expect(onShowTracks).toHaveBeenCalledWith('spotify:playlist:workout')
    expect(onPlaylistPlay).not.toHaveBeenCalled()
  })

  it('filters instantly and adds new Spotify results without duplicates', async () => {
    renderGrid()
    await screen.findByRole('button', { name: 'Play playlist: Workout' })
    fireEvent.change(screen.getByLabelText('Filter or search playlists'), {
      target: { value: 'leg' },
    })
    expect(
      screen.queryByRole('button', { name: 'Play playlist: Workout' })
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Play playlist: Legends' })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Play playlist: Leg Day' })
    ).toHaveLength(1)
  })

  it('shows the load error', async () => {
    global.fetch = jest.fn(() => respond({}, false)) as jest.Mock
    renderGrid()
    await waitFor(() =>
      expect(screen.getByText('Failed to fetch playlists')).toBeInTheDocument()
    )
  })
})
