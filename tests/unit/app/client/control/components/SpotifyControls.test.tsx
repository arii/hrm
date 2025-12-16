/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'

import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { useWebSocket } from '@/context/WebSocketContext'
import useVolumePreference from '@/hooks/useVolumePreference'
import { mockRouter } from '@/utils/test-utils/mockRouter'

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock the volume preference hook
jest.mock('@/hooks/useVolumePreference')

describe('components/SpotifyControls', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    mockSendData = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        isPlaying: true,
        devices: [
          { id: '1', name: 'Device 1', is_active: true, volume_percent: 50 },
        ],
      },
      sendData: mockSendData,
    })
    ;(useVolumePreference as jest.Mock).mockReturnValue({
      volume: 50,
      muted: false,
      setVolume: jest.fn(),
      toggleMute: jest.fn(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders Spotify controls with track info', () => {
    render(<SpotifyControls />)
    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('sends a GET_DEVICES command on mount if connected', () => {
    render(<SpotifyControls />)
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SPOTIFY_COMMAND',
      command: 'GET_DEVICES',
    })
  })

  it('handles playback commands', () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByLabelText('Pause'))
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND',
        command: 'PAUSE',
      })
    )
  })

  it('should render the mute button with the correct aria-label', () => {
    render(<SpotifyControls />)
    const muteButton = screen.getByLabelText(/mute volume/i)
    expect(muteButton).toBeInTheDocument()
  })
})
