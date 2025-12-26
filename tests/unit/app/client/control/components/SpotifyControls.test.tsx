/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { mockRouter } from '@/utils/test-utils/mockRouter'
import useVolumePreference from '@/hooks/useVolumePreference'
import '@testing-library/jest-dom'

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock the WebSocket context
vi.mock('@/context/WebSocketContext', () => ({
  useWebSocket: vi.fn(),
}))

// Mock the volume preference hook
vi.mock('@/hooks/useVolumePreference')

describe('components/SpotifyControls', () => {
  let mockSendData: vi.Mock

  beforeEach(() => {
    mockSendData = vi.fn()
    ;(useRouter as vi.Mock).mockReturnValue(mockRouter)
    ;(useWebSocket as vi.Mock).mockReturnValue({
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
    ;(useVolumePreference as vi.Mock).mockReturnValue({
      volume: 50,
      muted: false,
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
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
