/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { useError } from '@/context/ErrorContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import * as networkUtils from '@/utils/network'
import * as redirectUtils from '@/utils/redirect'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'authenticated' })),
}))

jest.mock('@/hooks/useSpotifyAuth', () => ({
  useSpotifyAuth: jest.fn(() => ({ status: 'authenticated' })),
}))

jest.mock('@/context/ErrorContext', () => ({
  useError: jest.fn(),
}))

jest.mock('@/utils/network', () => ({
  ...jest.requireActual('@/utils/network'),
  fetchWithRetry: jest.fn(),
}))

jest.mock('@/utils/redirect', () => ({
  redirectTo: jest.fn(),
}))

const mockSignOut = signOut as jest.Mock
const mockUseError = useError as jest.Mock
const mockFetchWithRetry = networkUtils.fetchWithRetry as jest.Mock
const mockRedirectTo = redirectUtils.redirectTo as jest.Mock
const mockUseSpotifyAuth = useSpotifyAuth as jest.Mock

// Mock Spotify SDK
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
  let mockAddError: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockAddError = jest.fn()
    mockUseError.mockReturnValue({ addError: mockAddError })
    mockUseSpotifyAuth.mockReturnValue({ status: 'authenticated' })
  })

  it('should initialize the SDK and connect the player on mount', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'fake-token' }),
    })

    renderHook(() => useSpotifyWebPlayback())

    await waitFor(() => {
      expect(window.Spotify.Player).toHaveBeenCalled()
      expect(mockPlayer.connect).toHaveBeenCalled()
    })
  })

  it('should call signOut and addError on 401 error from fetchWithRetry', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    })

    renderHook(() => useSpotifyWebPlayback())

    // The hook's getOAuthToken is called by the Spotify Player constructor.
    const playerOptions = (window.Spotify.Player as jest.Mock).mock.calls[0][0]
    await playerOptions.getOAuthToken(() => {})

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        'Spotify session expired. Please log in again.',
        { persist: true }
      )
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false })
      expect(mockRedirectTo).toHaveBeenCalledWith('/?error=SpotifyAuthFailed')
    })
  })

  it('should call addError but not signOut for non-401 errors', async () => {
    const error: networkUtils.AppError = {
      message: 'Internal Server Error',
      code: 'HTTP_ERROR_500',
      retryable: true,
    }
    mockFetchWithRetry.mockRejectedValue(error)

    renderHook(() => useSpotifyWebPlayback())

    const playerOptions = (window.Spotify.Player as jest.Mock).mock.calls[0][0]
    await playerOptions.getOAuthToken(() => {})

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        'Failed to authenticate with Spotify: Internal Server Error',
        { persist: false }
      )
      expect(mockSignOut).not.toHaveBeenCalled()
    })
  })

  it('should update state when "ready" and "not_ready" events are fired', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'fake-token' }),
    })

    const { result } = renderHook(() => useSpotifyWebPlayback())

    // Wait for player to be initialized
    await waitFor(() => {
      expect(window.Spotify.Player).toHaveBeenCalled()
    })

    // Find the 'ready' listener
    const readyCall = mockPlayer.addListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'ready'
    )
    expect(readyCall).toBeDefined()
    const readyCallback = readyCall[1]

    // Simulate ready event
    await act(async () => {
      readyCallback({ device_id: 'test-device-id' })
    })

    expect(result.current.isReady).toBe(true)
    expect(result.current.deviceId).toBe('test-device-id')

    // Find the 'not_ready' listener
    const notReadyCall = mockPlayer.addListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'not_ready'
    )
    expect(notReadyCall).toBeDefined()
    const notReadyCallback = notReadyCall[1]

    // Simulate not_ready event
    await act(async () => {
      notReadyCallback({ device_id: 'test-device-id' })
    })

    expect(result.current.isReady).toBe(false)
    expect(result.current.deviceId).toBeNull()
  })

  it('should not initialize the player if the user is not authenticated', () => {
    mockUseSpotifyAuth.mockReturnValue({ status: 'unauthenticated' })

    renderHook(() => useSpotifyWebPlayback())

    expect(window.Spotify.Player).not.toHaveBeenCalled()
  })
})
