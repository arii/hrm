/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import PlaylistDetails from '../../../../components/Spotify/PlaylistDetails'
import { Track } from '../../../../types/spotify'

describe('PlaylistDetails', () => {
  const mockTracks: Track[] = [
    {
      id: '1',
      name: 'Track 1',
      artists: [{ name: 'Artist 1' }],
      album: { name: 'Album 1' },
      uri: 'spotify:track:1',
    },
    {
      id: '2',
      name: 'Track 2',
      artists: [{ name: 'Artist 2' }],
      album: { name: 'Album 2' },
      uri: 'spotify:track:2',
    },
  ]

  it('displays a loading message when isLoading is true', () => {
    render(<PlaylistDetails tracks={[]} isLoading={true} hasSelection={true} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays an error message when an error is provided', () => {
    render(
      <PlaylistDetails
        tracks={[]}
        isLoading={false}
        error="Failed to load tracks"
        hasSelection={true}
      />
    )
    expect(screen.getByText('Failed to load tracks')).toBeInTheDocument()
  })

  it('displays a message when no playlist is selected', () => {
    render(<PlaylistDetails tracks={[]} isLoading={false} hasSelection={false} />)
    expect(
      screen.getByText('Select a playlist to see its tracks.')
    ).toBeInTheDocument()
  })

  it('displays a message when the selected playlist is empty', () => {
    render(<PlaylistDetails tracks={[]} isLoading={false} hasSelection={true} />)
    expect(screen.getByText('This playlist is empty.')).toBeInTheDocument()
  })

  it('displays the track list when tracks are provided', () => {
    render(<PlaylistDetails tracks={mockTracks} isLoading={false} hasSelection={true} />)

    expect(screen.getByText('Track 1')).toBeInTheDocument()
    expect(
      screen.getByText('Artist 1 - Album 1', { exact: false })
    ).toBeInTheDocument()
    expect(screen.getByText('Track 2')).toBeInTheDocument()
    expect(
      screen.getByText('Artist 2 - Album 2', { exact: false })
    ).toBeInTheDocument()
  })
})
