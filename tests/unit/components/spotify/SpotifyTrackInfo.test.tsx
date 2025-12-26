/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import SpotifyTrackInfo from '@/components/spotify/SpotifyTrackInfo'
import '@testing-library/jest-dom'

describe('SpotifyTrackInfo', () => {
  it('renders the track name and artist', () => {
    render(<SpotifyTrackInfo trackName="Test Track" artistName="Test Artist" />)
    expect(screen.getByText('Test Track — Test Artist')).toBeInTheDocument()
  })

  it('renders "No Active Playback" when waiting for login', () => {
    render(
      <SpotifyTrackInfo
        trackName="Awaiting Login..."
        artistName=""
      />
    )
    expect(screen.getByText('No Active Playback')).toBeInTheDocument()
  })
})
