/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { SpotifyTrackItem } from '@/components/Spotify/SpotifyTrackItem'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import '@testing-library/jest-dom'

describe('SpotifyTrackItem', () => {
  const mockTrack: Track = {
    id: 'track-1',
    name: 'Test Track',
    uri: 'spotify:track:1',
    duration_ms: 180000,
    artists: [{ name: 'Test Artist' }],
    album: {
      name: 'Test Album',
      images: [
        { url: 'large-url', height: 640, width: 640 },
        { url: 'medium-url', height: 300, width: 300 },
        { url: 'small-url', height: 64, width: 64 },
      ],
    },
  }

  it('renders track information correctly', () => {
    render(
      <SpotifyTrackItem track={mockTrack} index={0} onTogglePlay={jest.fn()} />
    )

    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText(/Test Artist • Test Album/)).toBeInTheDocument()
    expect(screen.getByText('03:00')).toBeInTheDocument()
  })

  it('renders playback controls when requested', () => {
    render(
      <SpotifyTrackItem
        track={mockTrack}
        index={0}
        onTogglePlay={jest.fn()}
        showPlaybackControls
      />
    )

    expect(screen.getByLabelText('Play')).toBeInTheDocument()
  })

  it('renders Pause icon when isPlaying is true', () => {
    render(
      <SpotifyTrackItem
        track={mockTrack}
        index={0}
        onTogglePlay={jest.fn()}
        showPlaybackControls
        isPlaying
      />
    )

    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('calls onTogglePlay when clicked', () => {
    const onTogglePlay = jest.fn()
    render(
      <SpotifyTrackItem
        track={mockTrack}
        index={5}
        onTogglePlay={onTogglePlay}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(onTogglePlay).toHaveBeenCalledWith(mockTrack, 5)
  })

  it('uses small thumbnail if available', () => {
    render(
      <SpotifyTrackItem track={mockTrack} index={0} onTogglePlay={jest.fn()} />
    )

    const avatar = screen.getByRole('img', { hidden: true })
    // In jsdom, src attribute might be set on the img inside Avatar
    expect(avatar).toHaveAttribute('src', 'small-url')
  })

  it('falls back to large image if small is missing', () => {
    const trackWithOnlyLarge = {
      ...mockTrack,
      album: {
        ...mockTrack.album,
        images: [{ url: 'large-url', height: 640, width: 640 }],
      },
    }
    render(
      <SpotifyTrackItem
        track={trackWithOnlyLarge}
        index={0}
        onTogglePlay={jest.fn()}
      />
    )

    const avatar = screen.getByRole('img', { hidden: true })
    expect(avatar).toHaveAttribute('src', 'large-url')
  })
})
