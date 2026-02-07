// tests/unit/app/api/spotify/control/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/spotify/control/route'
import { getSpotifyApiFromSession } from '@/lib/spotify/sdk'
import { handleSpotifyApiError } from '@/services/spotifyApiErrorHandling'
import { getServerSession } from 'next-auth/next'

// Mock the dependencies
jest.mock('@/lib/spotify/sdk', () => ({
  getSpotifyApiFromSession: jest.fn(),
  getAuthenticatedSpotifyApi: jest.fn(), // Keeping this mock if it's used elsewhere implicitly or for completeness
}))
jest.mock('@/services/spotifyApiErrorHandling', () => ({
  handleSpotifyApiError: jest.fn(),
}))
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockedGetSpotifyApi = getSpotifyApiFromSession as jest.Mock
const mockedHandleError = handleSpotifyApiError as jest.Mock
const mockedGetServerSession = getServerSession as jest.Mock

// Mock player methods
const mockPlayer = {
  startResumePlayback: jest.fn(),
  pausePlayback: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
  setPlaybackVolume: jest.fn(),
  transferPlayback: jest.fn(),
}

const createRequest = (body: object) => {
  return new Request('http://localhost/api/spotify/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('API Route: /api/spotify/control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default successful mocks
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'test-token',
      user: { name: 'Test User' },
    })
    mockedGetSpotifyApi.mockReturnValue({ player: mockPlayer })
  })

  it('should return 401 if no session exists', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized: No active session')
  })

  it('should return 400 for an invalid command', async () => {
    const req = createRequest({ command: 'INVALID_COMMAND' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid command: INVALID_COMMAND')
  })

  it('should return 400 if SET_VOLUME is missing volumePercent', async () => {
    const req = createRequest({ command: 'SET_VOLUME' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('volumePercent must be provided for SET_VOLUME')
  })

  it('should return 400 if TRANSFER_PLAYBACK is missing deviceId', async () => {
    const req = createRequest({ command: 'TRANSFER_PLAYBACK' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Device ID is required for TRANSFER_PLAYBACK')
  })

  it('should call startResumePlayback for PLAY command', async () => {
    const req = createRequest({ command: 'PLAY', deviceId: 'test-device' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('PLAY')
    expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('test-device')
  })

  it('should call setPlaybackVolume for SET_VOLUME command', async () => {
    const req = createRequest({
      command: 'SET_VOLUME',
      volumePercent: 50,
      deviceId: 'test-device',
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('SET_VOLUME')
    expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, 'test-device')
  })

  it('should call transferPlayback for TRANSFER_PLAYBACK command', async () => {
    const req = createRequest({
      command: 'TRANSFER_PLAYBACK',
      deviceId: 'new-device',
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('TRANSFER_PLAYBACK')
    expect(mockPlayer.transferPlayback).toHaveBeenCalledWith(
      ['new-device'],
      true
    )
  })

  it('should use handleSpotifyApiError when a player command fails', async () => {
    const spotifyError = new Error('Spotify API blew up')
    mockPlayer.pausePlayback.mockRejectedValue(spotifyError)

    const req = createRequest({ command: 'PAUSE' })
    await POST(req)

    // Check that our centralized error handler was called
    expect(mockedHandleError).toHaveBeenCalledWith(spotifyError)
  })

  it('should return 500 for unexpected errors', async () => {
    // Force SDK creation to throw (which happens synchronously or inside the logic flow)
    mockedGetSpotifyApi.mockImplementation(() => {
      throw new Error('Something unexpected happened')
    })

    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('An unexpected error occurred.')
  })
})
