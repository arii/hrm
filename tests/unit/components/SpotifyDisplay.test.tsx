/** @jest-environment jsdom */

import { jest } from '@jest/globals'
// Mock the uuid module at the top level BEFORE any other imports
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import SpotifyDisplay from '@/components/SpotifyDisplay'
import { ErrorProvider } from '@/context/ErrorContext'
import {
  SpotifyDevicesProvider,
  useSharedSpotifyDevices,
} from '@/context/SpotifyDevicesContext'
import { useWebSocket } from '@/context/WebSocketContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signIn } from 'next-auth/react'
import React from 'react'

// Mock dependencies
jest.mock('@/context/SpotifyDevicesContext', () => ({
  ...jest.requireActual('@/context/SpotifyDevicesContext'),
  useSharedSpotifyDevices: jest.fn(),
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
const mockedUseSharedSpotifyDevices = useSharedSpotifyDevices as jest.Mock

// Custom renderer to wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ErrorProvider>
      <SpotifyDevicesProvider>{ui}</SpotifyDevicesProvider>
    </ErrorProvider>
  )
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
    mockedUseSharedSpotifyDevices.mockReturnValue({
      devices: [],
      selectedDeviceId: null,
      isLoading: false,
      error: null,
      refreshDevices: jest.fn(),
      handleDeviceSelected: jest.fn(),
    })
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
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
})
