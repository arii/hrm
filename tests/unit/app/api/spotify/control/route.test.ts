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

const createRequest = (
  body: object | string,
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
) => {
  const request = new NextRequest('http://localhost/api/spotify/control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

  // Manually set cookies
  for (const [key, value] of Object.entries(cookies)) {
    request.cookies.set(key, value)
  }

  return request
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
  it('should return 403 Forbidden if CSRF token is missing from headers', async () => {
    const req = createRequest(
      { command: 'PLAY' },
      {},
      { [csrf.CSRF_COOKIE_NAME]: 'cookie-token' }
    )
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: CSRF token missing from headers')
  })

  it('should return 403 Forbidden if CSRF token is invalid', async () => {
    mockedCsrf.validateCsrfToken.mockReturnValue(false)
    const req = createRequest(
      { command: 'PLAY' },
      { 'x-csrf-token': 'invalid' },
      { [csrf.CSRF_COOKIE_NAME]: 'cookie-token' }
    )
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
    const req = createRequest(
      '{"command": "PLAY",}',
      {
        'x-csrf-token': 'valid',
      },
      { [csrf.CSRF_COOKIE_NAME]: 'cookie-token' }
    )
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
})
