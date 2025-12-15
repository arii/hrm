/** @jest-environment jsdom */

// Mock the uuid module at the top level BEFORE any other imports
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import SpotifyDisplay from '@/components/SpotifyDisplay'
import { ErrorProvider } from '@/context/ErrorContext'
import { useWebSocket } from '@/context/WebSocketContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import React from 'react'

// Mock child components and dependencies
jest.mock('@/components/AuthButton', () => ({
  __esModule: true,
  default: () => <button>Login with Spotify</button>,
}))
jest.mock('@/context/WebSocketContext')
jest.mock('next-auth/react')
jest.mock('@/hooks/useSpotifyWebPlayback', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock
const mockedUseSpotifyWebPlayback = useSpotifyWebPlayback as jest.Mock

// Custom renderer to wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ErrorProvider>{ui}</ErrorProvider>)
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

  it('should render the login button when not logged in', async () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })
    mockedUseWebSocket.mockReturnValue({
      spotifyData: { trackName: '', artist: '', isPlaying: false },
      spotifyServiceInitialized: true,
    })
    mockedUseSpotifyWebPlayback.mockReturnValue({
      isAuthenticated: false,
    })

    renderWithProviders(<SpotifyDisplay />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /login with spotify/i })
      ).toBeInTheDocument()
    })
  })

  it('should render "No Active Playback" when logged in but trackName is "Awaiting Login..."', async () => {
    mockedUseSession.mockReturnValue({
      data: { accessToken: 'fake-token' },
      status: 'authenticated',
    })
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        trackName: 'Awaiting Login...',
        artist: '',
        isPlaying: false,
      },
      spotifyServiceInitialized: true,
    })

    renderWithProviders(<SpotifyDisplay />)

    await waitFor(() => {
      expect(screen.getByText('No Active Playback')).toBeInTheDocument()
    })
  })

  it('should render the track name and artist when a track is playing', async () => {
    mockedUseSession.mockReturnValue({
      data: { accessToken: 'fake-token' },
      status: 'authenticated',
    })
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        isPlaying: true,
      },
      spotifyServiceInitialized: true,
    })

    renderWithProviders(<SpotifyDisplay />)

    await waitFor(() => {
      expect(screen.getByText(/Test Track — Test Artist/i)).toBeInTheDocument()
    })
  })
})
