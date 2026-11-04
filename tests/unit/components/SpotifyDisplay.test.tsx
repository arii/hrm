/** @jest-environment jsdom */

import { jest } from '@jest/globals'
// Mock the uuid module at the top level BEFORE any other imports
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import SpotifyDisplay from '@/components/SpotifyDisplay'
import {
  AUTO_TRANSFER_COOLDOWN_KEY,
  AUTO_TRANSFER_COOLDOWN_MS,
} from '@/constants/spotify'
import { ErrorProvider } from '@/context/ErrorContext'
import {
  useSpotifyData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
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

const mockedUseSpotifyData = useSpotifyData as jest.Mock
const mockedUseConnection = useWebSocketConnection as jest.Mock
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
    mockedUseSpotifyData.mockReturnValue({
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
    })
    mockedUseConnection.mockReturnValue({
      connectionStatus: 'Connected',
    })
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isAuthenticated: false,
    })

    renderWithProviders(<SpotifyDisplay />)

    const loginButton = await screen.findByRole('button', {
      name: /login with spotify/i,
    })
    expect(loginButton).toBeInTheDocument()

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    try {
      // Simulate user click
      await userEvent.click(loginButton)
    } finally {
      logSpy.mockRestore()
    }

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
      mockedUseSpotifyData.mockReturnValue(initialSpotifyData)
      mockedUseConnection.mockReturnValue({
        sendData: mockSendData,
        connectionStatus: 'Connected',
      })

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
      mockedUseSpotifyData.mockReturnValue(playingData)
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
      mockedUseSpotifyData.mockReturnValue(updatedSpotifyData)
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
      mockedUseSpotifyData.mockReturnValue({
        ...initialSpotifyData,
        devices: [],
      })
      rerender(<SpotifyDisplay />)

      const sliderContainer = screen.getByTestId('volume-slider')
      expect(sliderContainer.getAttribute('data-disabled')).toBe('true')
    })
  })

  describe('auto-connect', () => {
    const hrmDevice = {
      id: 'hrm-device-id',
      name: 'HRM Web Player',
      is_active: false,
      is_private_session: false,
      is_restricted: false,
      type: 'Computer',
      volume_percent: 50,
    }

    const idlePlayback = {
      track: {
        id: null,
        name: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      isMuted: false,
      volume_percent: 50,
      progress_ms: 0,
    }

    const setupAutoConnect = (devices: (typeof hrmDevice)[]) => {
      localStorage.removeItem(AUTO_TRANSFER_COOLDOWN_KEY)
      mockedUseSession.mockReturnValue({
        data: { accessToken: 'fake-token' },
        status: 'authenticated',
      })
      mockedUseSpotifyWebPlayback.mockReturnValue({
        isReady: true,
        deviceId: 'hrm-device-id',
        player: null,
        isAuthenticated: true,
      })
      mockedUseSpotifyData.mockReturnValue({
        devices,
        playback: idlePlayback,
      })
      mockedUseConnection.mockReturnValue({
        sendData: jest.fn(),
        connectionStatus: 'Connected',
      })
      mockedUseSpotifyCommand.mockReturnValue({
        ...mockHookValue,
        activeDevice: devices.find((d) => d.is_active) ?? null,
        hrmPlayer: devices.find((d) => d.name === 'HRM Web Player') ?? null,
        playback: idlePlayback,
      })
    }

    it('silently transfers to the browser player when nothing is active', () => {
      setupAutoConnect([hrmDevice])
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).toHaveBeenCalledWith('TRANSFER_PLAYBACK', {
        deviceId: 'hrm-device-id',
        play: false,
      })
    })

    it('never steals playback when another device is active', () => {
      setupAutoConnect([
        hrmDevice,
        { ...hrmDevice, id: 'other-device', name: 'Speaker', is_active: true },
      ])
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).not.toHaveBeenCalled()
    })

    it('waits for the device list instead of transferring blind', () => {
      setupAutoConnect([])
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).not.toHaveBeenCalled()
    })

    it('does nothing until the player is ready', () => {
      setupAutoConnect([hrmDevice])
      mockedUseSpotifyWebPlayback.mockReturnValue({
        isReady: false,
        deviceId: null,
        player: null,
        isAuthenticated: true,
      })
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).not.toHaveBeenCalled()
    })

    it('fires once per device id', () => {
      setupAutoConnect([hrmDevice])
      const { rerender } = renderWithProviders(<SpotifyDisplay />)
      rerender(<SpotifyDisplay />)
      expect(executeMock).toHaveBeenCalledTimes(1)
    })

    it('does not refire within the cooldown for a new device id', () => {
      setupAutoConnect([hrmDevice])
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).toHaveBeenCalledTimes(1)
      mockedUseSpotifyWebPlayback.mockReturnValue({
        isReady: true,
        deviceId: 'hrm-device-id-2',
        player: null,
        isAuthenticated: true,
      })
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).toHaveBeenCalledTimes(1)
    })

    it('refires after the cooldown expires', () => {
      jest.useFakeTimers()
      try {
        setupAutoConnect([hrmDevice])
        renderWithProviders(<SpotifyDisplay />)
        expect(executeMock).toHaveBeenCalledTimes(1)
        act(() => {
          jest.advanceTimersByTime(AUTO_TRANSFER_COOLDOWN_MS + 1000)
        })
        mockedUseSpotifyWebPlayback.mockReturnValue({
          isReady: true,
          deviceId: 'hrm-device-id-2',
          player: null,
          isAuthenticated: true,
        })
        renderWithProviders(<SpotifyDisplay />)
        expect(executeMock).toHaveBeenCalledTimes(2)
      } finally {
        jest.useRealTimers()
      }
    })

    it('does nothing while disconnected', () => {
      setupAutoConnect([hrmDevice])
      mockedUseConnection.mockReturnValue({
        ...mockedUseConnection(),
        connectionStatus: 'Disconnected',
      })
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).not.toHaveBeenCalled()
    })

    it('never steals audible playback', () => {
      setupAutoConnect([hrmDevice])
      mockedUseSpotifyData.mockReturnValue({
        devices: [hrmDevice],
        playback: { ...idlePlayback, is_playing: true },
      })
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).not.toHaveBeenCalled()
    })

    it('shows only the active badge when the HRM player is active', () => {
      const activeHrm = { ...hrmDevice, is_active: true }
      setupAutoConnect([activeHrm])
      mockedUseSpotifyCommand.mockReturnValue({
        ...mockHookValue,
        activeDevice: activeHrm,
        isHrmPlayerActive: true,
      })
      renderWithProviders(<SpotifyDisplay />)
      expect(screen.getByText(/Browser Player Active/)).toBeInTheDocument()
      expect(
        screen.queryByText(/Connect to HRM Web Player/)
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/Connecting/)).not.toBeInTheDocument()
    })

    it('shows the pending chip (not the button) right after auto-fire', () => {
      setupAutoConnect([hrmDevice])
      renderWithProviders(<SpotifyDisplay />)
      expect(executeMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Connecting…')).toBeInTheDocument()
      expect(
        screen.queryByText(/Connect to HRM Web Player/)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Browser Player Active/)
      ).not.toBeInTheDocument()
    })

    it('falls back to the button 15s after an unconfirmed auto-fire', () => {
      jest.useFakeTimers()
      try {
        setupAutoConnect([hrmDevice])
        renderWithProviders(<SpotifyDisplay />)
        expect(screen.getByText('Connecting…')).toBeInTheDocument()
        act(() => {
          jest.advanceTimersByTime(15000)
        })
        expect(
          screen.getByText(/Connect to HRM Web Player/)
        ).toBeInTheDocument()
        expect(screen.queryByText('Connecting…')).not.toBeInTheDocument()
      } finally {
        jest.useRealTimers()
      }
    })

    it('shows the connecting badge while the SDK is not ready', () => {
      setupAutoConnect([hrmDevice])
      mockedUseSpotifyWebPlayback.mockReturnValue({
        isReady: false,
        deviceId: null,
        player: null,
        isAuthenticated: true,
      })
      renderWithProviders(<SpotifyDisplay />)
      expect(screen.getByText(/Connecting Player/)).toBeInTheDocument()
      expect(
        screen.queryByText(/Connect to HRM Web Player/)
      ).not.toBeInTheDocument()
    })

    it('keeps the badge across brief list flaps, drops after 3 negatives', () => {
      const activeHrm = { ...hrmDevice, is_active: true }
      const idleHrm = { ...hrmDevice, is_active: false }
      setupAutoConnect([activeHrm])
      mockedUseSpotifyCommand.mockReturnValue({
        ...mockHookValue,
        activeDevice: activeHrm,
        isHrmPlayerActive: true,
      })
      const { rerender } = renderWithProviders(<SpotifyDisplay />)
      expect(screen.getByText(/Browser Player Active/)).toBeInTheDocument()

      // Two consecutive polls without active: badge holds (flap).
      for (let i = 0; i < 2; i++) {
        mockedUseSpotifyData.mockReturnValue({
          devices: [{ ...idleHrm }],
          playback: idlePlayback,
        })
        rerender(<SpotifyDisplay />)
        expect(screen.getByText(/Browser Player Active/)).toBeInTheDocument()
      }

      // Third consecutive negative: latch releases.
      mockedUseSpotifyData.mockReturnValue({
        devices: [{ ...idleHrm }],
        playback: idlePlayback,
      })
      rerender(<SpotifyDisplay />)
      expect(
        screen.queryByText(/Browser Player Active/)
      ).not.toBeInTheDocument()
    })

    it('stays silent while playing even with auto-pending set', () => {
      setupAutoConnect([hrmDevice])
      const { rerender } = renderWithProviders(<SpotifyDisplay />)
      expect(screen.getByText('Connecting…')).toBeInTheDocument()

      mockedUseSpotifyData.mockReturnValue({
        devices: [{ ...hrmDevice }],
        playback: { ...idlePlayback, is_playing: true },
      })
      rerender(<SpotifyDisplay />)
      expect(screen.queryByText('Connecting…')).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Connect to HRM Web Player/)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Browser Player Active/)
      ).not.toBeInTheDocument()
    })
  })
})
