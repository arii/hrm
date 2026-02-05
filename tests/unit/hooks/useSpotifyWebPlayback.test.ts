/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import { useError } from '@/context/ErrorContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'

jest.mock('@/hooks/useSpotifyAuth', () => ({
  useSpotifyAuth: jest.fn(() => ({ status: 'authenticated' })),
}))

jest.mock('@/context/ErrorContext', () => ({
  useError: jest.fn(),
}))

const mockUseError = useError as jest.Mock
const mockUseSpotifyAuth = useSpotifyAuth as jest.Mock

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
    mockUseSpotifyAuth.mockReturnValue({
      status: 'authenticated',
      session: { accessToken: 'fake-token' },
    })
  })

  it('should initialize the SDK and connect the player on mount', async () => {
    renderHook(() => useSpotifyWebPlayback())

    await waitFor(() => {
      expect(window.Spotify.Player).toHaveBeenCalled()
      expect(mockPlayer.connect).toHaveBeenCalled()
    })
  })

  it('should provide the access token from the session to the player', async () => {
    mockUseSpotifyAuth.mockReturnValue({
      status: 'authenticated',
      session: { accessToken: 'valid-token' },
    })

    renderHook(() => useSpotifyWebPlayback())

    await waitFor(() => {
      expect(window.Spotify.Player).toHaveBeenCalled()
    })

    const playerOptions = (window.Spotify.Player as jest.Mock).mock.calls[0][0]
    const tokenCallback = jest.fn()

    await playerOptions.getOAuthToken(tokenCallback)

    expect(tokenCallback).toHaveBeenCalledWith('valid-token')
  })

  it('should call addError if no access token is available in session', async () => {
    mockUseSpotifyAuth.mockReturnValue({
      status: 'authenticated',
      session: { accessToken: undefined },
    })

    renderHook(() => useSpotifyWebPlayback())

    await waitFor(() => {
      expect(window.Spotify.Player).toHaveBeenCalled()
    })

    const playerOptions = (window.Spotify.Player as jest.Mock).mock.calls[0][0]
    await playerOptions.getOAuthToken(jest.fn())

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to authenticate with Spotify: No access token'
        ),
        { persist: false }
      )
    })
  })

  it('should not initialize the player if the user is not authenticated', () => {
    mockUseSpotifyAuth.mockReturnValue({ status: 'unauthenticated' })

    renderHook(() => useSpotifyWebPlayback())

    // Wait a bit to ensure timeout would have fired if it was going to
    return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
      expect(window.Spotify.Player).not.toHaveBeenCalled()
    })
  })

  it('should not initialize the player if the user is not authenticated', () => {
    mockUseSpotifyAuth.mockReturnValue({ status: 'unauthenticated' })

    renderHook(() => useSpotifyWebPlayback())

    expect(window.Spotify.Player).not.toHaveBeenCalled()
  })
})
