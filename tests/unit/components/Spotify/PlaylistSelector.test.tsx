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

  it('should fetch and display playlists on render after opening the dropdown', async () => {
    render(
      <PlaylistSelector
        onPlaylistSelected={jest.fn()}
        onPlaylistPlay={jest.fn()}
      />
    )
    const user = userEvent.setup()

    // Click the autocomplete input to open the dropdown
    const input = await screen.findByRole('combobox')
    await user.click(input)

    // Wait for the playlists to be fetched and rendered in the listbox
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /Chill Hits/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: /Rock Classics/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: /Focus Flow/i })
      ).toBeInTheDocument()
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

    // Click the autocomplete input to open the dropdown
    const input = await screen.findByRole('combobox')
    await user.click(input)

    // Click the "Rock Classics" option
    const rockClassicsOption = await screen.findByRole('option', {
      name: /Rock Classics/i,
    })
    await user.click(rockClassicsOption)

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

    // Click the autocomplete input to open the dropdown
    const input = await screen.findByRole('combobox')
    await user.click(input)

    // Find the option
    const focusFlowOption = await screen.findByRole('option', {
      name: /Focus Flow/i,
    })

    // Find the play button within that option and click it
    const playButton = within(focusFlowOption).getByRole('button', {
      name: /Play Focus Flow/i,
    })
    await user.click(playButton)

    expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:3')
  })
})
