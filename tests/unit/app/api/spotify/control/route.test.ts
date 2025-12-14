// tests/unit/app/api/spotify/control/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/spotify/control/route'
import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock global fetch
global.fetch = jest.fn()

const mockedGetServerSession = getServerSession as jest.Mock
const mockedFetch = global.fetch as jest.Mock

const createRequest = (body: object | string): NextRequest => {
  return new NextRequest('http://localhost/api/spotify/control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('API Route: /api/spotify/control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'fake-access-token',
    })
    mockedFetch.mockResolvedValue(new Response(null, { status: 204 }))
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
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/play?device_id=test-device',
      expect.any(Object)
    )
  })

  it('should handle SET_VOLUME command successfully', async () => {
    const req = createRequest({ command: 'SET_VOLUME', volume: 50 })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=50',
      expect.any(Object)
    )
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
    const fetchOptions = mockedFetch.mock.calls[0][1]
    const body = JSON.parse(fetchOptions.body as string)
    expect(body).toEqual({ device_ids: ['new-device'], play: true })
  })

  it('should forward Spotify API errors', async () => {
    mockedFetch.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Device not found' } }), { status: 404 }))
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Spotify API error')
    expect(data.details).toBe('Device not found')
  })


  it('should return 500 if fetch throws an error', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'))
    const req = createRequest({ command: 'PLAY' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error processing command.')
  })
})
