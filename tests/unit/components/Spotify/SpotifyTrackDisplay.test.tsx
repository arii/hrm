/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import SpotifyTrackDisplay from '@/components/Spotify/SpotifyTrackDisplay'

describe('SpotifyTrackDisplay', () => {
  it('renders loading skeletons when connecting', () => {
    const { container } = render(
      <SpotifyTrackDisplay
        track={{ name: '', artist: '', albumName: '', albumArtUrl: '' }}
        isReady={false}
        deviceId={null}
        connectionStatus="Connecting"
      />
    )
    const skeletons = container.querySelectorAll('.MuiSkeleton-root')
    expect(skeletons).toHaveLength(3)
  })

  it('renders empty state when nothing is playing', () => {
    render(
      <SpotifyTrackDisplay
        track={{ name: '', artist: '', albumName: '', albumArtUrl: '' }}
        isReady={false}
        deviceId={null}
        connectionStatus="Connected"
      />
    )

    expect(screen.getByText('Nothing playing on Spotify.')).toBeInTheDocument()
  })

  it('renders "Awaiting Login..." as empty state', () => {
    render(
      <SpotifyTrackDisplay
        track={{
          name: 'Awaiting Login...',
          artist: '',
          albumName: '',
          albumArtUrl: '',
        }}
        isReady={false}
        deviceId={null}
        connectionStatus="Connected"
      />
    )

    expect(screen.getByText('Nothing playing on Spotify.')).toBeInTheDocument()
  })

  it('renders track information when data is available', () => {
    const track = {
      name: 'Test Track',
      artist: 'Test Artist',
      albumName: 'Test Album',
      albumArtUrl: 'http://example.com/art.jpg',
    }

    render(
      <SpotifyTrackDisplay
        track={track}
        isReady={true}
        deviceId="test-device"
        connectionStatus="Connected"
      />
    )

    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByText('Test Album')).toBeInTheDocument()
    const albumArt = screen.getByAltText('Test Album')
    expect(albumArt).toBeInTheDocument()
    // next/image generates complex src
    expect(albumArt).toHaveAttribute('src')
  })

  it('renders connecting player message', () => {
    render(
      <SpotifyTrackDisplay
        track={{
          name: 'Test Track',
          artist: '',
          albumName: '',
          albumArtUrl: '',
        }}
        isReady={false}
        deviceId={null}
        connectionStatus="Connected"
      />
    )
    expect(screen.getByText('🔄 Connecting Player...')).toBeInTheDocument()
  })

  it('renders browser player active message', () => {
    render(
      <SpotifyTrackDisplay
        track={{
          name: 'Test Track',
          artist: '',
          albumName: '',
          albumArtUrl: '',
        }}
        isReady={true}
        deviceId="test-device"
        connectionStatus="Connected"
      />
    )
    expect(screen.getByText('🎵 Browser Player Active')).toBeInTheDocument()
  })
})
