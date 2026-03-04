/** @jest-environment jsdom */

import { jest } from '@jest/globals'
// Mock the uuid module at the top level BEFORE any other imports
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import SpotifyDisplay from '@/components/SpotifyDisplay'
import { ErrorProvider } from '@/context/ErrorContext'
import { useWebSocket, WebSocketContextType } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signIn } from 'next-auth/react'
import React from 'react'
import { SpotifyData } from '@/types/websocket'

// Mock dependencies
jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: ({
    volume,
    muted,
    onVolumeChange,
    onVolumeChangeCommitted,
    onToggleMute,
    disabled,
  }: {
    volume: number
    muted: boolean
    onVolumeChange: (value: number) => void
    onVolumeChangeCommitted: (value: number) => void
    onToggleMute: () => void
    disabled?: boolean
  }) => (
    <div data-testid="volume-slider" data-disabled={disabled}>
      <input
        type="range"
        aria-label="Volume control"
        value={volume}
        onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
        onMouseUp={(e) =>
          onVolumeChangeCommitted(
            parseInt((e.target as HTMLInputElement).value, 10)
          )
        }
        disabled={disabled}
      />
      <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute} />
    </div>
  ),
}))
jest.mock('@/components/Spotify/CurrentSpotifyItemDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="current-spotify-item-display" />,
}))
jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyCommand')
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'), // Keep original functionality
  useSession: jest.fn(), // Mock useSession specifically
  signIn: jest.fn(), // Mock signIn specifically
  signOut: jest.fn(),
}))
jest.mock('@/hooks/useSpotifyWebPlayback', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock
const mockedSignIn = signIn as jest.Mock
const mockedUseSpotifyWebPlayback = useSpotifyWebPlayback as jest.Mock
const mockedUseSpotifyCommand = useSpotifyCommand as jest.MockedFunction<
  typeof useSpotifyCommand
>

// Custom renderer to wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ErrorProvider })
}

describe('SpotifyDisplay', () => {
  const executeMock = jest.fn()

  const mockHookValue = {
    execute: executeMock,
    activeDevice: {
      id: 'mock-device-1',
      name: 'Test Device',
      is_active: true,
      is_private_session: false,
      is_restricted: false,
      type: 'Computer',
      volume_percent: 50,
    },
    hrmPlayer: null,
    playback: {
      track: {
        id: 't1',
        name: 'Song',
        artist: 'Artist',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: true,
      volume_percent: 50,
      isMuted: false,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  }

  beforeEach(() => {
    jest.resetAllMocks()
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isReady: true,
      deviceId: 'mock-device-id',
      player: null,
      isAuthenticated: true,
    })
    mockedUseSpotifyCommand.mockReturnValue(mockHookValue)

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock
  })

  it('should render login button and call signIn with correct provider on click', async () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        devices: [],
        playback: {
          track: {
            id: null,
            name: '',
            artist: '',
            albumName: '',
            albumArtUrl: '',
          },
          is_playing: false,
          isMuted: false,
          volume_percent: 0,
          progress_ms: 0,
        },
      },
      connectionStatus: 'Connected',
      spotifyServiceInitialized: true,
    } as unknown as WebSocketContextType)
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isAuthenticated: false,
    })

    renderWithProviders(<SpotifyDisplay />)

    const loginButton = await screen.findByRole('button', {
      name: /login with spotify/i,
    })
    expect(loginButton).toBeInTheDocument()

    // Simulate user click
    await userEvent.click(loginButton)

    // Assert that signIn was called correctly
    expect(mockedSignIn).toHaveBeenCalledTimes(1)
    expect(mockedSignIn).toHaveBeenCalledWith('spotify', {
      callbackUrl: '/',
      redirect: true,
    })
  })

  describe('when authenticated', () => {
    let mockSendData: jest.Mock
    let rerender: (ui: React.ReactElement) => void
    let initialSpotifyData: SpotifyData

    beforeEach(() => {
      jest.useFakeTimers()
      mockSendData = jest.fn()
      initialSpotifyData = {
        devices: [
          {
            id: 'mock-device-1',
            name: 'Test Device',
            is_active: true,
            is_private_session: false,
            is_restricted: false,
            type: 'Computer',
            volume_percent: 50,
          },
        ],
        playback: {
          track: {
            id: 'mock-track-id',
            name: 'Test Track',
            artist: 'Test Artist',
            albumName: 'Test Album',
            albumArtUrl: '',
          },
          is_playing: true,
          isMuted: false,
          volume_percent: 50,
          progress_ms: 0,
        },
      }

      mockedUseSession.mockReturnValue({
        data: { accessToken: 'fake-token' },
        status: 'authenticated',
      })
      mockedUseWebSocket.mockReturnValue({
        spotifyData: initialSpotifyData,
        sendData: mockSendData,
        connectionStatus: 'Connected',
        spotifyServiceInitialized: true,
      } as unknown as WebSocketContextType)

      const { rerender: rerenderComponent } = renderWithProviders(
        <SpotifyDisplay />
      )
      rerender = (ui: React.ReactElement) => rerenderComponent(ui)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('handles playback toggle (Pause)', () => {
      const pauseButton = screen.getByLabelText('Pause')
      fireEvent.click(pauseButton)
      expect(executeMock).toHaveBeenCalledWith('PAUSE')
    })

    it('handles playback toggle (Play)', () => {
      const playingData = {
        ...initialSpotifyData,
        playback: { ...initialSpotifyData.playback, is_playing: false },
      }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: playingData,
      } as unknown as WebSocketContextType)
      rerender(<SpotifyDisplay />)

      const playButton = screen.getByLabelText('Play')
      fireEvent.click(playButton)
      expect(executeMock).toHaveBeenCalledWith('PLAY')
    })

    it('handles Skip Next', () => {
      const nextButton = screen.getByLabelText('Next track')
      fireEvent.click(nextButton)
      expect(executeMock).toHaveBeenCalledWith('NEXT')
    })

    it('handles Skip Previous', () => {
      const prevButton = screen.getByLabelText('Previous track')
      fireEvent.click(prevButton)
      expect(executeMock).toHaveBeenCalledWith('PREVIOUS')
    })

    it('updates volume on external change when user is not sliding', () => {
      const slider = screen.getByRole('slider', { name: /volume control/i })
      expect(slider).toHaveValue('50')

      // Simulate external update
      const updatedSpotifyData = {
        ...initialSpotifyData,
        playback: { ...initialSpotifyData.playback, volume_percent: 80 },
      }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: updatedSpotifyData,
      } as unknown as WebSocketContextType)
      rerender(<SpotifyDisplay />)

      expect(slider).toHaveValue('80')
    })

    it('sends volume command when sliding stops', () => {
      const slider = screen.getByRole('slider', { name: /volume control/i })
      fireEvent.change(slider, { target: { value: '70' } })
      fireEvent.mouseUp(slider)

      expect(executeMock).toHaveBeenCalledWith('SET_VOLUME', {
        volume: 70,
        deviceId: 'mock-device-1',
      })
    })

    it('handles mute toggle', () => {
      const muteButton = screen.getByLabelText('Mute')
      fireEvent.click(muteButton)

      expect(executeMock).toHaveBeenCalledWith('SET_VOLUME', {
        volume: 0,
        deviceId: 'mock-device-1',
      })
    })

    it('disables volume control when no device is active', () => {
      mockedUseSpotifyCommand.mockReturnValue({
        ...mockHookValue,
        activeDevice: null,
      })
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: { ...initialSpotifyData, devices: [] },
      } as unknown as WebSocketContextType)
      rerender(<SpotifyDisplay />)

      const sliderContainer = screen.getByTestId('volume-slider')
      expect(sliderContainer.getAttribute('data-disabled')).toBe('true')
    })
  })
})
