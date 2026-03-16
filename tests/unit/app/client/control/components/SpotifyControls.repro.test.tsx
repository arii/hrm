/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import SpotifyControls from '@/app/client/control/components/SpotifyControls'
import { mockRouter } from '@/utils/test-utils/mockRouter'
import useVolumePreference from '@/hooks/useVolumePreference'
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
jest.mock('@/hooks/useVolumePreference', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    volume: 50,
    muted: false,
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
  })),
  clampVolume: (v: number) => v,
}))

// Mock the snackbar hook
jest.mock('@/hooks/useAppSnackbar', () => ({
  useAppSnackbar: jest.fn(() => ({
    showWarning: jest.fn(),
  })),
}))

describe('SpotifyControls Reproduction', () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('shows controls when an active device exists even if track is not playing (bug reproduction)', () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      spotifyData: createMockSpotifyData({
        playback: {
          ...createMockSpotifyData().playback,
          track: {
            id: null,
            name: 'Awaiting Login...',
            artist: '',
            albumName: '',
            albumArtUrl: '',
          },
          is_playing: false,
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
      sendData: jest.fn(),
      spotifyServiceInitialized: true,
    })

    render(<SpotifyControls />)

    // CURRENT BEHAVIOR (Buggy):
    // The "Select Music" button is shown because hasSpotifyData is false
    // EXPECTED BEHAVIOR (Fixed):
    // Playback controls should be shown because an active device exists

    const selectMusicButton = screen.queryByTestId('spotify-select-music-button')
    const playButton = screen.queryByLabelText('Play')

    // EXPECTED BEHAVIOR (Fixed):
    // Playback controls should be shown because an active device exists

    expect(selectMusicButton).not.toBeInTheDocument()
    expect(playButton).toBeInTheDocument()
  })
})
