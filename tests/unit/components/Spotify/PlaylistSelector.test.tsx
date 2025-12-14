/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlaylistSelector from '@/components/Spotify/PlaylistSelector'
import { ErrorProvider } from '@/context/ErrorContext'

// Mock the fetch function
global.fetch = jest.fn()

const mockPlaylists = {
  presetPlaylists: [{ name: 'Chill Hits', uri: 'spotify:playlist:chill' }],
  userPlaylists: [{ name: 'Focus Flow', uri: 'spotify:playlist:focus' }],
}

describe('PlaylistSelector', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
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

    await waitFor(() => {
      expect(screen.getByText('Chill Hits')).toBeInTheDocument()
      expect(screen.getByText('Focus Flow')).toBeInTheDocument()
    })
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

    await waitFor(async () => {
      await user.click(screen.getByText('Focus Flow'))
      expect(onPlaylistSelected).toHaveBeenCalledWith('spotify:playlist:focus')
    })
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

    await waitFor(async () => {
      // Find the play button associated with "Chill Hits"
      const playlistItem = screen.getByText('Chill Hits').closest('li')
      const playButton = playlistItem?.querySelector('[aria-label="play"]')
      if (playButton) {
        await user.click(playButton)
      }
      expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:chill')
    })
  })
})
