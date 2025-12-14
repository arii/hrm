/** @jest-environment jsdom */

// Mock the uuid module at the top level BEFORE any other imports
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

import SpotifyDisplay from '@/components/SpotifyDisplay'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'
import { screen, waitFor } from '@testing-library/react'
import React from 'react'
import { render } from '../test-utils'

// Mock child components and dependencies
jest.mock('@/context/WebSocketContext')

const mockedUseWebSocket = useWebSocket as jest.Mock

describe('SpotifyDisplay', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Provide a default mock for useWebSocket
    mockedUseWebSocket.mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      spotifyData: {
        trackName: 'Awaiting Login...',
        artist: '',
        isPlaying: false,
      },
    })
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock
  })

  it('should render "No Active Playback" when logged in but trackName is "Awaiting Login..."', async () => {
    render(
      <SpotifyDisplay
        spotifyData={{
          trackName: 'Awaiting Login...',
          artist: '',
          isPlaying: false,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No Active Playback')).toBeInTheDocument()
    })
  })

  it('should render the track name and artist when a track is playing', async () => {
    render(
      <SpotifyDisplay
        spotifyData={{
          trackName: 'Test Track',
          artist: 'Test Artist',
          isPlaying: true,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Test Track — Test Artist/i)).toBeInTheDocument()
    })
  })
})
