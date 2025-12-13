/**
 * @jest-environment jsdom
 */
// tests/unit/components/Spotify/PlaylistSelector.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaylistSelector from '@/components/Spotify/PlaylistSelector'
import { ErrorProvider } from '@/context/ErrorContext'

// Mock the fetch function
global.fetch = jest.fn()

const mockPlaylists = {
  presetPlaylists: [
    { name: 'Preset Playlist 1', uri: 'spotify:playlist:preset1' },
  ],
  userPlaylists: [{ name: 'User Playlist 1', uri: 'spotify:playlist:user1' }],
}

describe('PlaylistSelector', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPlaylists),
    })
  })

  it('should fetch and display playlists on render', async () => {
    render(
      <ErrorProvider>
        <PlaylistSelector
          onPlaylistSelected={jest.fn()}
          onPlaylistPlay={jest.fn()}
        />
      </ErrorProvider>
    )

    expect(await screen.findByText(/Preset Playlist 1/i)).toBeInTheDocument()
    expect(await screen.findByText(/User Playlist 1/i)).toBeInTheDocument()
  })

  it('should call onPlaylistSelected with the correct URI when a playlist is selected from the list', async () => {
    const onPlaylistSelected = jest.fn()
    render(
      <ErrorProvider>
        <PlaylistSelector
          onPlaylistSelected={onPlaylistSelected}
          onPlaylistPlay={jest.fn()}
        />
      </ErrorProvider>
    )

    const userPlaylistItem = await screen.findByText(/User Playlist 1/i)
    fireEvent.click(userPlaylistItem)
    expect(onPlaylistSelected).toHaveBeenCalledWith('spotify:playlist:user1')
  })

  it('should call onPlaylistPlay with the correct URI when the play button is clicked', async () => {
    const onPlaylistPlay = jest.fn()
    render(
      <ErrorProvider>
        <PlaylistSelector
          onPlaylistSelected={jest.fn()}
          onPlaylistPlay={onPlaylistPlay}
        />
      </ErrorProvider>
    )

    const presetPlaylistItem = await screen.findByText(/Preset Playlist 1/i)
    // Find the play button associated with "Preset Playlist 1"
    const playlistItem = presetPlaylistItem.closest('li')
    const playButton = playlistItem?.querySelector('[aria-label="play"]')
    if (playButton) {
      fireEvent.click(playButton)
    }
    expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:preset1')
  })
})
