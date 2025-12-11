import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import PlaylistSelector from '@/components/Spotify/PlaylistSelector'

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        presetPlaylists: [
          { name: 'HIIT', uri: 'spotify:playlist:hiit' },
          { name: 'Rock', uri: 'spotify:playlist:rock' },
        ],
        userPlaylists: [{ name: 'My Playlist', uri: 'spotify:playlist:my' }],
      }),
  })
) as jest.Mock

describe('PlaylistSelector', () => {
  it('renders and allows playlist selection', async () => {
    const onPlaylistSelected = jest.fn()
    const onPlaylistPlay = jest.fn()
    render(
      <PlaylistSelector
        onPlaylistSelected={onPlaylistSelected}
        onPlaylistPlay={onPlaylistPlay}
      />
    )
    // Wait for playlists to load
    await screen.findByText('HIIT')
    fireEvent.click(screen.getByText('HIIT'))
    expect(onPlaylistSelected).toHaveBeenCalledWith('spotify:playlist:hiit')
    fireEvent.click(screen.getByRole('button', { name: /Play/i }))
    expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:hiit')
  })
})
