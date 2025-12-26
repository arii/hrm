/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import { renderHook } from '@testing-library/react-hooks'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'

// Mock the Spotify SDK
const mockPlayer = {
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
}
window.Spotify = {
  Player: jest.fn().mockImplementation(() => mockPlayer),
}

describe('useSpotifyWebPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize the Spotify player and return it', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSpotifyWebPlayback()
    )

    // Wait for the hook to initialize
    await waitForNextUpdate()

    expect(window.Spotify.Player).toHaveBeenCalledWith({
      name: 'HRM Web Player',
      getOAuthToken: expect.any(Function),
      volume: 0.5,
    })
    expect(mockPlayer.connect).toHaveBeenCalled()
    expect(result.current.player).toBe(mockPlayer)
  })
})
