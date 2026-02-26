/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { mockRouter } from '@/utils/test-utils/mockRouter'
import {
  createMockSpotifyData,
  createMockSpotifyDevice,
} from '@/tests/test-utils'
import '@testing-library/jest-dom'

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock the spotify constants
jest.mock('@/constants/spotify', () => ({
  ...jest.requireActual('@/constants/spotify'),
  HRM_WEB_PLAYER_NAME: 'HRM Web Player',
}))

// Mock sub-components that have complex side effects or hooks
jest.mock(
  '@/app/client/control/components/spotify/SpotifyVolumeControl',
  () => ({
    __esModule: true,
    default: ({
      onVolumeChangeCommitted,
    }: {
      onVolumeChangeCommitted: (v: number) => void
    }) => (
      <div data-testid="mock-volume-control">
        <button onClick={() => onVolumeChangeCommitted(75)}>
          Set Volume 75
        </button>
      </div>
    ),
  })
)

describe('components/SpotifyControls', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    mockSendData = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          track: {
            ...createMockSpotifyData().playback.track,
            name: 'Test Track',
            artist: 'Test Artist',
          },
          is_playing: true,
        },
        devices: [
          createMockSpotifyDevice({
            id: '1',
            name: 'Device 1',
            is_active: true,
            volume_percent: 50,
          }),
        ],
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
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

  it('handles volume change committed', () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByText('Set Volume 75'))
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: 75,
        deviceId: '1',
      })
    )
  })

  it('navigates to playlist selection on browse click', () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByTestId('spotify-select-playlist-button'))
    expect(mockRouter.push).toHaveBeenCalledWith('/client/spotify-selection')
  })

  it('shows select music button when no track is playing', () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          track: { name: '', artist: '' },
        },
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    render(<SpotifyControls />)
    expect(
      screen.getByTestId('spotify-select-music-button')
    ).toBeInTheDocument()
  })
})
