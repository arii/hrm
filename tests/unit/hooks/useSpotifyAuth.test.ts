/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { useError } from '@/context/ErrorContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'

// Mock the dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('@/context/ErrorContext', () => ({
  useError: jest.fn(),
}))

const mockUseSession = useSession as jest.Mock
const mockSignOut = signOut as jest.Mock
const mockUseError = useError as jest.Mock

describe('useSpotifyAuth', () => {
  let mockAddError: jest.Mock

  beforeEach(() => {
    // Reset mocks before each test
    mockAddError = jest.fn()
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })
    mockUseError.mockReturnValue({ addError: mockAddError })
    mockSignOut.mockClear()
  })

  it('should return unauthenticated status when session is null', () => {
    const { result } = renderHook(() => useSpotifyAuth())

    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.session).toBeNull()
  })

  it('should return authenticated status when session exists', () => {
    const mockSession = { accessToken: '123', user: { name: 'Test User' } }
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    const { result } = renderHook(() => useSpotifyAuth())

    expect(result.current.status).toBe('authenticated')
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.session).toEqual(mockSession)
  })

  it('should return loading status', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' })

    const { result } = renderHook(() => useSpotifyAuth())

    expect(result.current.status).toBe('loading')
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('should call signOut and addError when session has RefreshAccessTokenError', () => {
    const mockSession = {
      error: 'RefreshAccessTokenError',
      accessToken: 'expired-token',
    }
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    renderHook(() => useSpotifyAuth())

    expect(mockAddError).toHaveBeenCalledWith(
      'Spotify session expired. Please log in again.',
      { persist: true }
    )
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should not call signOut or addError for other errors or no error', () => {
    const mockSession = {
      error: 'SomeOtherError',
      accessToken: 'valid-token',
    }
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    const { rerender } = renderHook(() => useSpotifyAuth())

    expect(mockAddError).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()

    // Rerender with no error
    const validSession = { accessToken: 'valid-token' }
    mockUseSession.mockReturnValue({
      data: validSession,
      status: 'authenticated',
    })
    rerender()

    expect(mockAddError).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
