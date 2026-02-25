/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import SpotifyTrackDisplay from '@/app/client/control/components/spotify/SpotifyTrackDisplay'
import '@testing-library/jest-dom'

describe('components/spotify/SpotifyTrackDisplay', () => {
  it('renders track name and artist', () => {
    render(
      <SpotifyTrackDisplay trackName="Test Track" artistName="Test Artist" />
    )
    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
  })
})
