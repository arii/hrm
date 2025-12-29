/** @jest-environment jsdom */

import PlaylistSelector from '@/components/Spotify/PlaylistSelector'
import '@testing-library/jest-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPlaylists = {
  presetPlaylists: [
    { id: '1', name: 'Chill Hits', uri: 'spotify:playlist:1' },
    { id: '2', name: 'Rock Classics', uri: 'spotify:playlist:2' },
  ],
  userPlaylists: [{ id: '3', name: 'Focus Flow', uri: 'spotify:playlist:3' }],
}

describe('PlaylistSelector', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlaylists),
      })
    ) as jest.Mock
  })

  it('should fetch and display playlists on render', async () => {
    render(
      <PlaylistSelector
        onPlaylistSelected={jest.fn()}
        onPlaylistPlay={jest.fn()}
      />
    )
    const user = userEvent.setup()
    const input = await screen.findByRole('combobox')
    await user.click(input)

    // Wait for the playlists to be fetched and rendered
    await waitFor(() => {
      expect(screen.getByText('Chill Hits')).toBeInTheDocument()
      expect(screen.getByText('Rock Classics')).toBeInTheDocument()
      expect(screen.getByText('Focus Flow')).toBeInTheDocument()
    })
  })

  it('should call onPlaylistSelected with the correct URI when a playlist is selected from the list', async () => {
    const onPlaylistSelected = jest.fn()
    render(
      <PlaylistSelector
        onPlaylistSelected={onPlaylistSelected}
        onPlaylistPlay={jest.fn()}
      />
    )
    const user = userEvent.setup()
    const input = await screen.findByRole('combobox')
    await user.click(input)
    const rockClassicsItem = await screen.findByText('Rock Classics')
    await user.click(rockClassicsItem)

    // Verify the callback was called with the correct URI
    expect(onPlaylistSelected).toHaveBeenCalledWith('spotify:playlist:2')
  })

  it('should call onPlaylistPlay with the correct URI when the play button is clicked', async () => {
    const onPlaylistPlay = jest.fn()
    render(
      <PlaylistSelector
        onPlaylistSelected={jest.fn()}
        onPlaylistPlay={onPlaylistPlay}
      />
    )
    const user = userEvent.setup()
    const input = await screen.findByRole('combobox')
    await user.click(input)
    const focusFlowItem = await screen.findByText('Focus Flow')
    const listItem = focusFlowItem.closest('li')
    if (!listItem) throw new Error('Playlist item not found')

    const playButton = within(listItem).getByRole('button', { name: /play/i })

    await user.click(playButton)

    expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:3')
  })
})
