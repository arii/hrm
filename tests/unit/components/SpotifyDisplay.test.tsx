/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import SpotifyDisplay from '@/components/SpotifyDisplay'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { ErrorProvider } from '@/context/ErrorContext'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')
jest.mock('next-auth/react')

const mockedUseWebSocket = useWebSocket as jest.Mock
const mockedUseSession = useSession as jest.Mock

describe('SpotifyDisplay', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<ErrorProvider>{component}</ErrorProvider>)
  }

  it('should render the login button when not authenticated', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        trackName: 'Awaiting Login...',
      },
    })
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
    renderWithProviders(<SpotifyDisplay />)
    expect(screen.getByText('Login with Spotify')).toBeInTheDocument()
  })

  it('should render the track info when authenticated', () => {
    mockedUseWebSocket.mockReturnValue({
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        isPlaying: true,
        devices: [],
      },
      connectionStatus: 'Connected',
    })
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Test User',
        },
      },
      status: 'authenticated',
    })
    renderWithProviders(<SpotifyDisplay />)
    expect(screen.getByText('Test Track — Test Artist')).toBeInTheDocument()
  })
})
