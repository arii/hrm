/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { useError } from '@/context/ErrorContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import * as networkUtils from '@/utils/network'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

jest.mock('@/context/ErrorContext', () => ({
  useError: jest.fn(),
}))

jest.mock('@/utils/network', () => ({
  ...jest.requireActual('@/utils/network'),
  fetchWithRetry: jest.fn(),
}))

const mockSignOut = signOut as jest.Mock
const mockUseError = useError as jest.Mock
const mockFetchWithRetry = networkUtils.fetchWithRetry as jest.Mock

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
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const error: networkUtils.AppError = {
      message: 'Unauthorized',
      code: 'HTTP_ERROR_401',
      retryable: false,
    }
    mockFetchWithRetry.mockRejectedValue(error)

    renderHook(() => useSpotifyWebPlayback())

    // The hook's getOAuthToken is called by the Spotify Player constructor.
    // We need to extract it and call it manually to test the error handling.
    const playerOptions = (window.Spotify.Player as jest.Mock).mock.calls[0][0]
    await playerOptions.getOAuthToken(() => {})

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        'Spotify session expired. Please log in again.',
        { persist: true }
      )
      expect(mockSignOut).toHaveBeenCalled()
    })
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('should call addError but not signOut for non-401 errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
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
    consoleErrorSpy.mockRestore()
  })
})
