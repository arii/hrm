
import { renderHook, act } from '@testing-library/react-hooks'
import useSpotifyWebPlayback from '../../../hooks/useSpotifyWebPlayback'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'

// Mock the fetchWithRetry utility
jest.mock('@/utils/network', () => ({
  ...jest.requireActual('@/utils/network'),
  fetchWithRetry: jest.fn(),
}))
const mockFetchWithRetry = jest.requireMock('@/utils/network').fetchWithRetry

// Mock the ErrorContext
jest.mock('@/context/ErrorContext', () => ({
  useError: () => ({
    addError: jest.fn(),
  }),
}))

describe('useSpotifyWebPlayback', () => {
  let mockPlayer: any

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock Spotify Player
    mockPlayer = {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }

    // Mock the global Spotify object
    window.Spotify = {
      Player: jest.fn().mockImplementation(() => mockPlayer),
    }
  })

  it('should initialize the SDK and player when authenticated', async () => {
    // Mock a successful token fetch
    mockFetchWithRetry.mockResolvedValue({
      json: () => Promise.resolve({ accessToken: 'fake-token' }),
    })

    const { result, waitForNextUpdate } = renderHook(() =>
      useSpotifyWebPlayback()
    )

    // Fire the SDK ready callback
    act(() => {
      window.onSpotifyWebPlaybackSDKReady()
    })

    // Wait for the player to be created and connected
    await waitForNextUpdate()

    // Assertions
    expect(window.Spotify.Player).toHaveBeenCalled()
    expect(mockPlayer.connect).toHaveBeenCalled()
    expect(result.current.player).not.toBeNull()
  })

  it('should handle unauthenticated users gracefully', async () => {
    // Mock a failed token fetch (401 Unauthorized)
    mockFetchWithRetry.mockRejectedValue({
      code: 'HTTP_ERROR_401',
      message: 'Unauthorized',
    })

    const { result } = renderHook(() => useSpotifyWebPlayback())

    // Fire the SDK ready callback
    act(() => {
      window.onSpotifyWebPlaybackSDKReady()
    })

    // Assertions
    expect(window.Spotify.Player).toHaveBeenCalled() // Player is still created
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.player).not.toBeNull() // Player instance should exist
  })

  it('should set isAuthenticated to true on successful token fetch', async () => {
    mockFetchWithRetry.mockResolvedValue({
      json: () => Promise.resolve({ accessToken: 'fake-token' }),
    })

    const { result, waitForNextUpdate } = renderHook(() =>
      useSpotifyWebPlayback()
    )

    // The getOAuthToken function is passed to the player, we need to call it
    const getOAuthToken = (window.Spotify.Player as jest.Mock).mock.calls[0][0]
      .getOAuthToken

    await act(async () => {
      await getOAuthToken(() => {})
    })

    expect(result.current.isAuthenticated).toBe(true)
  })
})
