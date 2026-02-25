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

// Mock VolumeSlider to easily trigger change events
jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: ({
    volume,
    onVolumeChange,
    onVolumeChangeCommitted,
  }: {
    volume: number
    onVolumeChange: (val: number) => void
    onVolumeChangeCommitted: (val: number) => void
  }) => (
    <input
      data-testid="volume-slider"
      type="range"
      value={volume}
      onChange={(e) => onVolumeChange(Number(e.target.value))}
      onMouseUp={(e) =>
        onVolumeChangeCommitted(Number((e.target as HTMLInputElement).value))
      }
    />
  ),
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

  it('prevents volume snap-back during slider drag', async () => {
    const setVolumeMock = jest.fn()
    const mockUseVolumePreference = useVolumePreference as jest.Mock

    // Initial render with matching volume to avoid initial sync
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          volume_percent: 80,
        },
        devices: [
          createMockSpotifyDevice({
            id: '1',
            is_active: true,
            volume_percent: 80,
          }),
        ],
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })
    mockUseVolumePreference.mockReturnValue({
      volume: 80,
      muted: false,
      setVolume: setVolumeMock,
      toggleMute: jest.fn(),
    })

    const { rerender } = render(<SpotifyControls />)

    const slider = screen.getByTestId('volume-slider')

    // Verify no initial sync happened
    expect(setVolumeMock).not.toHaveBeenCalled()

    // Simulate user starting to drag (onChange) to 85
    fireEvent.change(slider, { target: { value: 85 } })

    // Simulate WebSocket update arriving with DIFFERENT volume (e.g. 50) while dragging
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          volume_percent: 50, // Server says 50
        },
        devices: [
          createMockSpotifyDevice({
            id: '1',
            is_active: true,
            volume_percent: 50,
          }),
        ],
      }),
      sendData: mockSendData,
      spotifyServiceInitialized: true,
    })

    rerender(<SpotifyControls />)

    // Verify setVolume was NOT called with 50 (snap-back prevented)
    // It should have been called with 85 from the change event
    expect(setVolumeMock).toHaveBeenCalledWith(85)
    expect(setVolumeMock).not.toHaveBeenCalledWith(50)

    // Simulate user releasing slider (onMouseUp -> onVolumeChangeCommitted)
    fireEvent.mouseUp(slider, { target: { value: 85 } })

    // Command should be sent
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: 85,
      })
    )
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
      // for MUI components than checking the underlying value attribute.
      const deviceSelect = screen.getByRole('combobox')
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

    const volumeSlider = screen.getByTestId('volume-slider')
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

    const volumeSlider = screen.getByTestId('volume-slider')

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
