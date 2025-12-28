/** @jest-environment jsdom */

import PlaylistDetails from '@/components/Spotify/PlaylistDetails'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPlaylistDetails = {
  name: 'Rock Classics',
  description: 'Legendary rock anthems.',
  imageUrl: 'https://i.scdn.co/image/ab67706f0000000278b4745cb9ce8ec3a8157074',
  tracks: [
    {
      uri: 'spotify:track:1',
      name: 'Bohemian Rhapsody',
      artist: 'Queen',
      duration: '5:55',
    },
    {
      uri: 'spotify:track:2',
      name: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      duration: '8:02',
    },
  ],
}

describe('PlaylistDetails', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlaylistDetails),
      })
    ) as jest.Mock
  })

  it('should display a loading state initially', () => {
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:2"
        onBack={jest.fn()}
        onPlaylistPlay={jest.fn()}
      />
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should display playlist details after a successful fetch', async () => {
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:2"
        onBack={jest.fn()}
        onPlaylistPlay={jest.fn()}
      />
    )

    expect(await screen.findByText('Rock Classics')).toBeInTheDocument()
    expect(await screen.findByText(/Bohemian Rhapsody/)).toBeInTheDocument()
    expect(await screen.findByText(/Stairway to Heaven/)).toBeInTheDocument()
  })

  it('should display an error message if the fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      })
    ) as jest.Mock

    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:2"
        onBack={jest.fn()}
        onPlaylistPlay={jest.fn()}
      />
    )

    expect(
      await screen.findByText(
        'Playlist not found. It might be private or deleted.'
      )
    ).toBeInTheDocument()
  })

  it('should call onBack when the back button is clicked', async () => {
    const onBack = jest.fn()
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:2"
        onBack={onBack}
        onPlaylistPlay={jest.fn()}
      />
    )
    const user = userEvent.setup()

    const backButton = await screen.findByRole('button', {
      name: /Back to Playlists/i,
    })
    await user.click(backButton)
    expect(onBack).toHaveBeenCalled()
  })

  it('should call onPlaylistPlay with the correct URI when a track play button is clicked', async () => {
    const onPlaylistPlay = jest.fn()
    render(
      <PlaylistDetails
        playlistUri="spotify:playlist:2"
        onBack={jest.fn()}
        onPlaylistPlay={onPlaylistPlay}
      />
    )
    const user = userEvent.setup()

    const bohemianRhapsodyItem = await screen.findByText(/Bohemian Rhapsody/)
    const listItem = bohemianRhapsodyItem.closest('li')
    if (!listItem) throw new Error('List item not found')
    const playButton = within(listItem).getByRole('button', {
      name: /Play Bohemian Rhapsody/i,
    })
    await user.click(playButton)

    expect(onPlaylistPlay).toHaveBeenCalledWith(
      'spotify:playlist:2',
      'spotify:track:1'
    )
  })
})
