/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { mockRouter } from '@/utils/test-utils/mockRouter'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import {
  createMockSpotifyData,
  createMockSpotifyDevice,
} from '@/tests/test-utils'
import '@testing-library/jest-dom'

// Mock VolumeSlider to easily trigger its callbacks
jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: jest.fn(
    ({ volume, onVolumeChange, onVolumeChangeCommitted, onToggleMute }) => (
      <div data-testid="mock-volume-slider">
        <input
          type="range"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          onMouseUp={(e) =>
            onVolumeChangeCommitted?.(
              Number((e.target as HTMLInputElement).value)
            )
          }
          aria-label="Volume control"
        />
        <button onClick={onToggleMute} aria-label="Mute" />
      </div>
    )
  ),
}))

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock the volume preference hook
jest.mock('@/hooks/useVolumePreference', () => {
  const originalModule = jest.requireActual('@/hooks/useVolumePreference')
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn(),
  }
})

// Mock the snackbar hook
jest.mock('@/hooks/useAppSnackbar', () => ({
  useAppSnackbar: jest.fn(() => ({
    showWarning: jest.fn(),
  })),
}))

// Mock the spotify constants
jest.mock('@/constants/spotify', () => ({
  ...jest.requireActual('@/constants/spotify'),
  HRM_WEB_PLAYER_NAME: 'HRM Web Player',
}))

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
    const muteButton = screen.getByLabelText(/mute/i)
    expect(muteButton).toBeInTheDocument()
  })

  it('sends volume change command on commit', async () => {
    const setVolumeMock = jest.fn()
    const mockUseVolumePreference = useVolumePreference as jest.Mock

    mockUseVolumePreference.mockReturnValue({
      volume: 50,
      muted: false,
      setVolume: setVolumeMock,
      toggleMute: jest.fn(),
    })

    render(<SpotifyControls />)

    const volumeSlider = screen.getByRole('slider')

    // Simulate sliding stops
    fireEvent.change(volumeSlider, { target: { value: '80' } })
    fireEvent.mouseUp(volumeSlider, { target: { value: '80' } })

    // Command should be sent with the latest value
    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SPOTIFY_COMMAND',
          command: 'SET_VOLUME',
          volume: 80,
        })
      )
    })
  })

  it('prevents volume snap-back during slider drag', async () => {
    const setVolumeMock = jest.fn()
    const mockUseVolumePreference = useVolumePreference as jest.Mock
    const mockWebSocket = useWebSocket as jest.Mock

    // Initial state: volume 50
    mockUseVolumePreference.mockReturnValue({
      volume: 50,
      muted: false,
      setVolume: setVolumeMock,
      toggleMute: jest.fn(),
    })

    const { rerender } = render(<SpotifyControls />)

    const volumeSlider = screen.getByRole('slider')

    // Start sliding (updates local state to 80)
    fireEvent.change(volumeSlider, { target: { value: '80' } })

    // Simulate WebSocket update (server volume is still 50, or changed to 40)
    mockWebSocket.mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          volume_percent: 40,
        },
        devices: [
          createMockSpotifyDevice({
            id: '1',
            is_active: true,
            volume_percent: 40,
          }),
        ],
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    rerender(<SpotifyControls />)

    // setVolume should NOT have been called with the server value (40) because we are sliding
    expect(setVolumeMock).not.toHaveBeenCalledWith(40)

    // Stop sliding
    fireEvent.mouseUp(volumeSlider, { target: { value: '80' } })

    // Now it should send the command with 80
    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SPOTIFY_COMMAND',
          command: 'SET_VOLUME',
          volume: 80,
        })
      )
    })
  })

  it('selects HRM Web Player by default when no device is active', async () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        devices: [
          createMockSpotifyDevice({
            id: '1',
            name: 'Device 1',
            is_active: false,
          }),
          createMockSpotifyDevice({
            id: 'hrm-player',
            name: HRM_WEB_PLAYER_NAME,
            is_active: false,
          }),
        ],
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    render(<SpotifyControls />)

    await waitFor(() => {
      // Check the displayed text in the select component
      // use data-testid to avoid ambiguity with the new Autocomplete in SpotifySearchInput
      const deviceSelect = screen.getByTestId('spotify-device-select')
      expect(deviceSelect).toHaveTextContent(HRM_WEB_PLAYER_NAME)
    })
  })

  it('shows warning snackbar when changing volume while disconnected', () => {
    const showWarningMock = jest.fn()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({
      showWarning: showWarningMock,
    })
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Disconnected',
      spotifyData: createMockSpotifyData(),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    render(<SpotifyControls />)

    const volumeSlider = screen.getByRole('slider')
    fireEvent.change(volumeSlider, { target: { value: 80 } })

    expect(showWarningMock).toHaveBeenCalledWith('Changes not saved: Offline')
  })

  it('throttles warning snackbar when changing volume while disconnected', () => {
    jest.useFakeTimers()
    const showWarningMock = jest.fn()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({
      showWarning: showWarningMock,
    })
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Disconnected',
      spotifyData: createMockSpotifyData(),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    render(<SpotifyControls />)

    const volumeSlider = screen.getByRole('slider')

    // First change: warning shown
    fireEvent.change(volumeSlider, { target: { value: 60 } })
    expect(showWarningMock).toHaveBeenCalledTimes(1)

    // Rapid change within throttle window: warning not shown again
    fireEvent.change(volumeSlider, { target: { value: 70 } })
    fireEvent.change(volumeSlider, { target: { value: 80 } })
    expect(showWarningMock).toHaveBeenCalledTimes(1)

    // Advance time past throttle (3000ms)
    jest.advanceTimersByTime(3100)

    // Change after throttle: warning shown again
    fireEvent.change(volumeSlider, { target: { value: 90 } })
    expect(showWarningMock).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
  })

  it('uses HRM Web Player as fallback if no device is active or selected', () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          track: {
            id: 'track1',
            name: 'Test Track',
            artist: 'Test Artist',
            albumName: 'Album',
            albumArtUrl: '',
          },
          is_playing: false,
        },
        devices: [
          createMockSpotifyDevice({
            id: 'hrm-player',
            name: HRM_WEB_PLAYER_NAME,
            is_active: false,
          }),
        ],
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    render(<SpotifyControls />)

    const playButton = screen.getByLabelText('Play')
    fireEvent.click(playButton)

    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'hrm-player',
      })
    )
  })
})
