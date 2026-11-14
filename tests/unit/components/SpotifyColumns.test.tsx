/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatusColumn } from '@/components/Spotify/StatusColumn'
import { TransportColumn } from '@/components/Spotify/TransportColumn'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'

// Heavy children are stubbed; the columns' own markup is under test.
jest.mock('@/components/Spotify/DeviceRecommendation', () => ({
  __esModule: true,
  default: () => <div data-testid="device-recommendation" />,
}))
jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: () => <div data-testid="volume-slider" />,
}))
jest.mock('@/components/SpotifyDeviceSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="device-selector" />,
}))
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

describe('Spotify StatusColumn', () => {
  it('shows the now-playing text and hides all badges when idle', () => {
    render(
      <StatusColumn
        displayTrackName="Track"
        displayArtist="Artist"
        showConnectingBadge={false}
        showActiveBadge={false}
        showAutoPending={false}
        showConnectButton={false}
      />
    )
    expect(screen.getByTestId('spotify-now-playing')).toHaveTextContent(
      'Track Artist'
    )
    expect(screen.queryByText('🎵 Browser Player Active')).toBeNull()
  })

  it('renders the active badge and the device recommendation when flagged', () => {
    render(
      <StatusColumn
        displayTrackName="Track"
        displayArtist="Artist"
        showConnectingBadge={false}
        showActiveBadge={true}
        showAutoPending={false}
        showConnectButton={true}
      />
    )
    expect(screen.getByText('🎵 Browser Player Active')).toBeInTheDocument()
    expect(screen.getByTestId('device-recommendation')).toBeInTheDocument()
  })
})

describe('Spotify TransportColumn', () => {
  const executeSpotify = jest.fn() as unknown as ExecuteSpotify

  it('sends PAUSE with an optimistic not-playing guess while playing', () => {
    render(
      <TransportColumn displayPlaying={true} executeSpotify={executeSpotify} />
    )
    fireEvent.click(screen.getByTestId('spotify-play-pause-button'))
    expect(executeSpotify).toHaveBeenCalledWith('PAUSE')
  })

  it('sends PLAY while paused and the transport buttons dispatch skip commands', () => {
    render(
      <TransportColumn displayPlaying={false} executeSpotify={executeSpotify} />
    )
    fireEvent.click(screen.getByTestId('spotify-play-pause-button'))
    expect(executeSpotify).toHaveBeenCalledWith('PLAY')
    fireEvent.click(screen.getByTestId('spotify-previous-button'))
    expect(executeSpotify).toHaveBeenCalledWith('PREVIOUS')
    fireEvent.click(screen.getByTestId('spotify-next-button'))
    expect(executeSpotify).toHaveBeenCalledWith('NEXT')
  })
})
