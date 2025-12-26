/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import { render } from '@testing-library/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { ErrorProvider } from '@/context/ErrorContext'
import { useEffect } from 'react'

// Mock the Spotify SDK
const mockPlayer = {
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
}
global.window.Spotify = {
  Player: jest.fn().mockImplementation(() => mockPlayer),
}

describe('useSpotifyWebPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize the Spotify player and return it', () => {
    const TestComponent = () => {
      const { player } = useSpotifyWebPlayback()
      useEffect(() => {
        if (player) {
          // You can add assertions here if needed,
          // but for this test, we just want to ensure the player is initialized.
        }
      }, [player])
      return null
    }

    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    expect(window.Spotify.Player).toHaveBeenCalledWith({
      name: 'HRM Web Player',
      getOAuthToken: expect.any(Function),
      volume: 0.5,
    })
    expect(mockPlayer.connect).toHaveBeenCalled()
  })
})
