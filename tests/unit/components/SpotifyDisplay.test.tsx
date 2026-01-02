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
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signIn } from 'next-auth/react'
import React from 'react'
import { SpotifyData } from '@/types/websocket'
import { Device } from '@spotify/web-api-ts-sdk'

// Mock dependencies
jest.mock('@/components/Spotify/CurrentSpotifyItemDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="current-spotify-item-display" />,
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
jest.mock('@/hooks/useSpotifyControls')

import useSpotifyControls from '@/hooks/useSpotifyControls'

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock
const mockedSignIn = signIn as jest.Mock
const mockedUseSpotifyWebPlayback = useSpotifyWebPlayback as jest.Mock
const mockedUseSpotifyControls = useSpotifyControls as jest.Mock

// Custom renderer to wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ErrorProvider })
}

describe('SpotifyDisplay', () => {
  let mockSetVolume: jest.Mock
  let mockToggleMute: jest.Mock
  let mockSendSpotifyCommand: jest.Mock
  let mockSetSelectedDeviceId: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks for useSpotifyControls
    mockSetVolume = jest.fn()
    mockToggleMute = jest.fn()
    mockSendSpotifyCommand = jest.fn()
    mockSetSelectedDeviceId = jest.fn()

    mockedUseSpotifyControls.mockReturnValue({
      selectedDeviceId: 'mock-device-1',
      setSelectedDeviceId: mockSetSelectedDeviceId,
      devices: [
        { id: 'mock-device-1', name: 'Test Device', is_active: true },
      ] as Device[],
      volume: 70,
      setVolume: mockSetVolume,
      muted: false,
      toggleMute: mockToggleMute,
      sendSpotifyCommand: mockSendSpotifyCommand,
      handleTrackSelect: jest.fn(),
      handlePlaybackCommand: jest.fn(),
    })

    // Setup default mocks for other hooks
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isReady: true,
      deviceId: 'mock-device-id',
      player: null,
      isAuthenticated: true,
    })
  })

  it('should render login button and call signIn when unauthenticated', async () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })
    mockedUseWebSocket.mockReturnValue({ spotifyData: {} }) // Provide basic spotifyData

    renderWithProviders(<SpotifyDisplay />)
    const loginButton = screen.getByRole('button', {
      name: /login with spotify/i,
    })
    await userEvent.click(loginButton)

    expect(mockedSignIn).toHaveBeenCalledWith('spotify', {
      callbackUrl: '/',
      redirect: true,
    })
  })

  describe('when authenticated', () => {
    const initialSpotifyData: SpotifyData = {
      trackName: 'Test Track',
      artist: 'Test Artist',
      isPlaying: true,
      devices: [{ id: 'mock-device-1', name: 'Test Device', is_active: true }],
    }

    beforeEach(() => {
      mockedUseSession.mockReturnValue({
        data: { accessToken: 'fake-token' },
        status: 'authenticated',
      })
      mockedUseWebSocket.mockReturnValue({
        spotifyData: initialSpotifyData,
        connectionStatus: 'Connected',
      })
    })

    it('renders track and artist information', () => {
      renderWithProviders(<SpotifyDisplay />)
      expect(
        screen.getByText(/Test Track — Test Artist/i)
      ).toBeInTheDocument()
    })

    it('calls sendSpotifyCommand with "PAUSE" when pause button is clicked', async () => {
      renderWithProviders(<SpotifyDisplay />)
      const pauseButton = screen.getByRole('button', { name: /pause/i })
      await userEvent.click(pauseButton)
      expect(mockSendSpotifyCommand).toHaveBeenCalledWith('PAUSE')
    })

    it('calls sendSpotifyCommand with "PLAY" when play button is clicked', async () => {
      mockedUseWebSocket.mockReturnValue({
        spotifyData: { ...initialSpotifyData, isPlaying: false },
        connectionStatus: 'Connected',
      })

      renderWithProviders(<SpotifyDisplay />)
      const playButton = screen.getByRole('button', { name: /play/i })
      await userEvent.click(playButton)
      expect(mockSendSpotifyCommand).toHaveBeenCalledWith('PLAY')
    })

    it('calls sendSpotifyCommand with "NEXT" when next button is clicked', async () => {
      renderWithProviders(<SpotifyDisplay />)
      const nextButton = screen.getByRole('button', { name: /next track/i })
      await userEvent.click(nextButton)
      expect(mockSendSpotifyCommand).toHaveBeenCalledWith('NEXT')
    })

    it('calls sendSpotifyCommand with "PREVIOUS" when previous button is clicked', async () => {
      renderWithProviders(<SpotifyDisplay />)
      const previousButton = screen.getByRole('button', {
        name: /previous track/i,
      })
      await userEvent.click(previousButton)
      expect(mockSendSpotifyCommand).toHaveBeenCalledWith('PREVIOUS')
    })

    it('calls setVolume when the volume slider is changed', () => {
      renderWithProviders(<SpotifyDisplay />)
      const slider = screen.getByRole('slider', { name: /volume control/i })
      fireEvent.change(slider, { target: { value: '50' } })
      expect(mockSetVolume).toHaveBeenCalledWith(50)
    })

    it('calls toggleMute when the mute button is clicked', async () => {
      renderWithProviders(<SpotifyDisplay />)
      const muteButton = screen.getByRole('button', { name: /mute volume/i })
      await userEvent.click(muteButton)
      expect(mockToggleMute).toHaveBeenCalled()
    })
  })
})
