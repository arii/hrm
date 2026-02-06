// tests/unit/app/api/spotify/control/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/spotify/control/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { AccessToken } from 'next-auth/jwt'

// Mock 'next-auth/next'
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock the Spotify SDK
jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockPlayer = {
    startResumePlayback: jest.fn(),
    pausePlayback: jest.fn(),
    skipToNext: jest.fn(),
    skipToPrevious: jest.fn(),
    setPlaybackVolume: jest.fn(),
    transferPlayback: jest.fn(),
  }
  return {
    SpotifyApi: {
      withAccessToken: jest.fn(() => ({
        player: mockPlayer,
      })),
    },
  }
})

const mockedGetServerSession = getServerSession as jest.Mock
const mockedSpotifyApi = SpotifyApi as jest.Mocked<typeof SpotifyApi>
const mockSdk = mockedSpotifyApi.withAccessToken(
  'test-client',
  {} as AccessToken
)
const mockPlayer = mockSdk.player as jest.Mocked<typeof mockSdk.player>

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
    // Mock a valid session
    mockedGetServerSession.mockResolvedValue({
      accessToken: {
        access_token: 'fake-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      } as AccessToken,
    })
    // Mock environment variable
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
  })

  it('should return 401 if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('should return 400 for an invalid command', async () => {
    const req = createRequest({ command: 'INVALID_COMMAND' })
    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid command')
  })

  it('should return 400 if deviceId is invalid type', async () => {
    const req = createRequest({ command: 'PLAY', deviceId: 123 })
    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid deviceId format')
  })

  it('should call startResumePlayback for PLAY command', async () => {
    const req = createRequest({ command: 'PLAY', deviceId: 'test-device' })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
      'test-device',
      undefined,
      undefined
    )
  })

  it('should call pausePlayback for PAUSE command', async () => {
    const req = createRequest({ command: 'PAUSE', deviceId: 'test-device' })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test-device')
  })

  it('should call pausePlayback with undefined when deviceId is missing', async () => {
    const req = createRequest({ command: 'PAUSE' })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPlayer.pausePlayback).toHaveBeenCalledWith(undefined)
  })

  it('should call setPlaybackVolume for SET_VOLUME command', async () => {
    const req = createRequest({
      command: 'SET_VOLUME',
      volume: 50,
      deviceId: 'test-device',
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, 'test-device')
  })

  it('should call setPlaybackVolume with undefined when deviceId is missing', async () => {
    const req = createRequest({
      command: 'SET_VOLUME',
      volume: 50,
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
  })

  it('should return 400 if volume is not a number for SET_VOLUME', async () => {
    const req = createRequest({ command: 'SET_VOLUME', volume: 'not-a-number' })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('should call transferPlayback for TRANSFER_PLAYBACK command', async () => {
    const req = createRequest({
      command: 'TRANSFER_PLAYBACK',
      deviceId: 'new-device',
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPlayer.transferPlayback).toHaveBeenCalledWith(
      ['new-device'],
      true
    )
  })

  it('should return 400 if deviceId is missing for TRANSFER_PLAYBACK', async () => {
    const req = createRequest({ command: 'TRANSFER_PLAYBACK' })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('should return 500 if SPOTIFY_CLIENT_ID is not set', async () => {
    delete process.env.SPOTIFY_CLIENT_ID
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    expect(response.status).toBe(500)
  })
})
