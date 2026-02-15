// tests/unit/app/api/spotify/control/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/spotify/control/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock @spotify/web-api-ts-sdk
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
}))

const mockedGetServerSession = getServerSession as jest.Mock
const mockedSpotifyApi = SpotifyApi as jest.Mocked<typeof SpotifyApi>

const createRequest = (body: object | string) => {
  return new Request('http://localhost/api/spotify/control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('API Route: /api/spotify/control', () => {
  let mockSdk: {
    player: {
      startResumePlayback: jest.Mock
      pausePlayback: jest.Mock
      skipToNext: jest.Mock
      skipToPrevious: jest.Mock
      setPlaybackVolume: jest.Mock
      transferPlayback: jest.Mock
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'fake-access-token',
    })

    mockSdk = {
      player: {
        startResumePlayback: jest.fn(),
        pausePlayback: jest.fn(),
        skipToNext: jest.fn(),
        skipToPrevious: jest.fn(),
        setPlaybackVolume: jest.fn(),
        transferPlayback: jest.fn(),
      },
    }
    mockedSpotifyApi.withAccessToken.mockReturnValue(mockSdk)
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authorization required')
  })

  it('should return 400 Bad Request for invalid JSON', async () => {
    const req = createRequest('{"command": "PLAY",}') // Invalid JSON
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('should return 400 Bad Request for an invalid command', async () => {
    const req = createRequest({ command: 'INVALID_COMMAND' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid command: INVALID_COMMAND')
  })

  it('should return 400 if SET_VOLUME is missing volume', async () => {
    const req = createRequest({ command: 'SET_VOLUME' }) // Missing 'volume'
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Volume parameter is required for SET_VOLUME')
  })

  it('should return 400 if TRANSFER_PLAYBACK is missing deviceId', async () => {
    const req = createRequest({ command: 'TRANSFER_PLAYBACK' }) // Missing 'deviceId'
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Device ID required for TRANSFER_PLAYBACK')
  })

  it('should handle PLAY command successfully', async () => {
    const req = createRequest({ command: 'PLAY', deviceId: 'test-device' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSdk.player.startResumePlayback).toHaveBeenCalledWith(
      'test-device'
    )
  })

  it('should handle SET_VOLUME command successfully', async () => {
    const req = createRequest({ command: 'SET_VOLUME', volume: 50 })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
  })

  it('should handle TRANSFER_PLAYBACK successfully', async () => {
    const req = createRequest({
      command: 'TRANSFER_PLAYBACK',
      deviceId: 'new-device',
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSdk.player.transferPlayback).toHaveBeenCalledWith(
      ['new-device'],
      true
    )
  })

  it('should forward Spotify API errors', async () => {
    const spotifyError = new Error('Device not found')
    Object.assign(spotifyError, { status: 404 })
    mockSdk.player.startResumePlayback.mockRejectedValue(spotifyError)
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Spotify API error')
    expect(data.details).toBe('Device not found')
  })

  it('should return 500 if SDK throws an error', async () => {
    mockSdk.player.startResumePlayback.mockRejectedValue(new Error('SDK error'))
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Spotify API error')
  })
})
