/** @jest-environment jsdom */

import { jest } from '@jest/globals'
// Mock the uuid module at the top level BEFORE any other imports
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import SpotifyDisplay from '@/components/SpotifyDisplay'
import { ErrorProvider } from '@/context/ErrorContext'
import { useWebSocket } from '@/context/WebSocketContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signIn } from 'next-auth/react'
import React from 'react'
import { SpotifyData } from '@/types/websocket'

// Mock dependencies
jest.mock('@/components/Spotify/CurrentSpotifyItemDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="current-spotify-item-display" />,
}))
jest.mock('@/components/SpotifyDeviceSelectorWrapper', () => ({
  __esModule: true,
  default: ({
    onDeviceSelect,
  }: {
    onDeviceSelect: (deviceId: string) => void
  }) => (
    <button
      data-testid="spotify-device-selector"
      onClick={() => onDeviceSelect('mock-device-id')}
    >
      Select Device
    </button>
  ),
}))
jest.mock('@/context/WebSocketContext')
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'), // Keep original functionality
  useSession: jest.fn(), // Mock useSession specifically
  signIn: jest.fn(), // Mock signIn specifically
}))
jest.mock('@/hooks/useSpotifyWebPlayback', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock
const mockedSignIn = signIn as jest.Mock
const mockedUseSpotifyWebPlayback = useSpotifyWebPlayback as jest.Mock

// Custom renderer to wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ErrorProvider })
}

describe('SpotifyDisplay', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isReady: true,
      deviceId: 'mock-device-id',
      player: null,
      isAuthenticated: true,
    })
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
        trackName: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
        isPlaying: false,
      },
      connectionStatus: 'Connected',
      spotifyServiceInitialized: true,
    })
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
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumName: 'Test Album',
        albumArtUrl: '',
        isPlaying: true,
        volume: 50,
        isMuted: false,
        devices: [
          { id: 'mock-device-1', name: 'Test Device', is_active: true },
        ],
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
      })

      const { rerender: rerenderComponent } = renderWithProviders(
        <SpotifyDisplay />
      )
      rerender = (ui: React.ReactElement) => rerenderComponent(ui)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('updates volume on external change when user is not sliding', () => {
      const slider = screen.getByRole('slider', { name: /volume control/i })
      expect(slider).toHaveValue('50')

      // Simulate external update
      const updatedSpotifyData = { ...initialSpotifyData, volume: 80 }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: updatedSpotifyData,
      })
      rerender(<SpotifyDisplay />)

      expect(slider).toHaveValue('80')
    })

    it('does not update volume on external change while user is sliding', () => {
      const slider = screen.getByRole('slider', { name: /volume control/i })
      expect(slider).toHaveValue('50')

      // Simulate user starting to slide
      fireEvent.change(slider, { target: { value: '70' } })
      expect(slider).toHaveValue('70')

      // Simulate external update while sliding
      const updatedSpotifyData = { ...initialSpotifyData, volume: 90 }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: updatedSpotifyData,
      })
      rerender(<SpotifyDisplay />)

      // Volume should not change because user is sliding
      expect(slider).toHaveValue('70')
    })

    it('re-enables external updates after sliding and debounce period', () => {
      const slider = screen.getByRole('slider', { name: /volume control/i })
      expect(slider).toHaveValue('50')

      // Simulate user sliding
      fireEvent.change(slider, { target: { value: '75' } })
      expect(slider).toHaveValue('75')

      // Simulate external update while sliding (should be ignored)
      let updatedSpotifyData = { ...initialSpotifyData, volume: 100 }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: updatedSpotifyData,
      })
      rerender(<SpotifyDisplay />)
      expect(slider).toHaveValue('75')

      // Advance timers to end the debounce period
      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Simulate another external update (should now be applied)
      updatedSpotifyData = { ...initialSpotifyData, volume: 25 }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: updatedSpotifyData,
      })
      rerender(<SpotifyDisplay />)
      expect(slider).toHaveValue('25')
    })
  })

  describe('Auto-selection and Command Sending', () => {
    let mockSendData: jest.Mock
    let initialSpotifyData: SpotifyData
    const hrmWebPlayerDeviceId = 'hrm-web-player-device-id'

    beforeEach(() => {
      jest.useFakeTimers()
      mockSendData = jest.fn()
      initialSpotifyData = {
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumName: 'Test Album',
        albumArtUrl: '',
        isPlaying: true,
        volume: 50,
        isMuted: false,
        devices: [
          {
            id: 'some-other-device',
            name: 'Some Other Device',
            is_active: false,
          },
        ],
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
      })
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('defaults to HRM Web Player when SDK is ready and no active device', async () => {
      mockedUseSpotifyWebPlayback.mockReturnValue({
        isReady: true,
        deviceId: hrmWebPlayerDeviceId,
        player: null,
        isAuthenticated: true,
      })

      // Ensure the web player device is part of the mocked devices for correct display logic
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: {
          ...initialSpotifyData,
          devices: [
            ...initialSpotifyData.devices,
            {
              id: hrmWebPlayerDeviceId,
              name: 'HRM Web Player',
              is_active: false,
            },
          ],
        },
      })

      await act(async () => {
        renderWithProviders(<SpotifyDisplay />)
      })

      expect(
        await screen.findByText('🎵 Browser Player Active')
      ).toBeInTheDocument()
    })

    it('sends command to the active device when no device is explicitly selected', () => {
      // Set the device to active in the mock data
      const updatedSpotifyData = {
        ...initialSpotifyData,
        devices: [{ ...initialSpotifyData.devices[0], is_active: true }],
      }
      mockedUseWebSocket.mockReturnValue({
        ...mockedUseWebSocket(),
        spotifyData: updatedSpotifyData,
      })

      renderWithProviders(<SpotifyDisplay />)
      const nextButton = screen.getByRole('button', { name: /next track/i })
      act(() => {
        fireEvent.click(nextButton)
      })
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'NEXT',
          deviceId: 'some-other-device',
        })
      )
    })
  })
})
