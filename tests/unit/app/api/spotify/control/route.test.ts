// tests/unit/app/api/spotify/control/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/spotify/control/route'
import { getServerSession } from 'next-auth/next'
import * as csrf from '@/lib/csrf'
import { NextRequest } from 'next/server'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock CSRF
jest.mock('@/lib/csrf')
const mockedCsrf = jest.mocked(csrf)

// Mock global fetch
global.fetch = jest.fn()

const mockedGetServerSession = getServerSession as jest.Mock
const mockedFetch = global.fetch as jest.Mock

const createRequest = (body: object | string, headers: HeadersInit = {}) => {
  const req = new NextRequest('http://localhost/api/spotify/control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return req
}

describe('API Route: /api/spotify/control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'fake-access-token',
    })
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 204, // Spotify often returns 204 No Content for success
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({ success: true }),
    })
    // Default to valid CSRF for most tests
    mockedCsrf.validateCsrfToken.mockReturnValue(true)
  })

  // Security Tests
  it('should return 403 Forbidden if CSRF token is missing', async () => {
    const req = createRequest({ command: 'PLAY' }) // No CSRF header
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: CSRF token missing')
  })

  it('should return 403 Forbidden if CSRF token is invalid', async () => {
    mockedCsrf.validateCsrfToken.mockReturnValue(false)
    const req = createRequest({ command: 'PLAY' }, { 'x-csrf-token': 'invalid' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Invalid CSRF token')
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const req = createRequest({ command: 'PLAY' }, { 'x-csrf-token': 'valid' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authorization required')
  })

  // Functional Tests
  it('should return 400 Bad Request for invalid JSON', async () => {
    const req = createRequest('{"command": "PLAY",}', {
      'x-csrf-token': 'valid',
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('should return 400 Bad Request for an invalid command', async () => {
    const req = createRequest(
      { command: 'INVALID_COMMAND' },
      { 'x-csrf-token': 'valid' }
    )
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid command: INVALID_COMMAND')
  })

  it('should return 400 if SET_VOLUME is missing volume', async () => {
    const req = createRequest(
      { command: 'SET_VOLUME' },
      { 'x-csrf-token': 'valid' }
    ) // Missing 'volume'
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Volume parameter is required for SET_VOLUME')
  })

  it('should return 400 if TRANSFER_PLAYBACK is missing deviceId', async () => {
    const req = createRequest(
      { command: 'TRANSFER_PLAYBACK' },
      { 'x-csrf-token': 'valid' }
    ) // Missing 'deviceId'
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Device ID required for TRANSFER_PLAYBACK')
  })

  it('should handle PLAY command successfully', async () => {
    const req = createRequest(
      { command: 'PLAY', deviceId: 'test-device' },
      { 'x-csrf-token': 'valid' }
    )
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/play?device_id=test-device',
      expect.any(Object)
    )
  })

  it('should handle SET_VOLUME command successfully', async () => {
    const req = createRequest(
      { command: 'SET_VOLUME', volume: 50 },
      { 'x-csrf-token': 'valid' }
    )
    await POST(req)

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=50',
      expect.any(Object)
    )
  })

  it('should handle TRANSFER_PLAYBACK successfully', async () => {
    const req = createRequest(
      {
        command: 'TRANSFER_PLAYBACK',
        deviceId: 'new-device',
      },
      { 'x-csrf-token': 'valid' }
    )
    await POST(req)

    const fetchOptions = mockedFetch.mock.calls[0][1]
    const body = JSON.parse(fetchOptions.body as string)
    expect(body).toEqual({ device_ids: ['new-device'], play: true })
  })

  it('should forward Spotify API errors', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: { message: 'Device not found' } })
        ),
    })
    const req = createRequest({ command: 'PLAY' }, { 'x-csrf-token': 'valid' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Spotify API error')
    expect(data.details).toBe('Device not found')
  })

  it('should return 500 if fetch throws an error', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'))
    const req = createRequest({ command: 'PLAY' }, { 'x-csrf-token': 'valid' })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error processing command.')
  })
})
