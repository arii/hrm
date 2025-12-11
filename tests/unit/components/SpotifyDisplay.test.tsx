import { render, screen } from '@testing-library/react'
import React from 'react'

import SpotifyDisplay from '@/components/SpotifyDisplay'
import { useWebSocket } from '@/context/WebSocketContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'

jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyWebPlayback')

describe('SpotifyDisplay', () => {
  it('renders spotify data', () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumArt: 'http://placekitten.com/200/300',
      },
    })
    ;(useSpotifyWebPlayback as jest.Mock).mockReturnValue({
      isReady: true,
      deviceId: 'test-device',
      transferPlayback: jest.fn(),
    })
    render(<SpotifyDisplay />)
    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'http://placekitten.com/200/300')
  })
})
