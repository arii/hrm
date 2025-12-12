// tests/unit/app/api/spotify/control/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/spotify/control/route'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

// Mock 'next-auth/next' for getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

const mockedGetServerSession = getServerSession as jest.Mock

// Mock global fetch
global.fetch = jest.fn()

describe('API Route: /api/spotify/control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204, // Default success for most control commands
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve(''),
    })
  })

  it('should return 401 if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'PLAY' }),
    })
    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.error).toBe('Authorization required')
  })

  it('should return 400 for an invalid command', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    const req = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'INVALID_COMMAND' }),
    })
    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid command')
  })

  const commands = [
    { name: 'PLAY', method: 'PUT', url: '/play' },
    { name: 'PAUSE', method: 'PUT', url: '/pause' },
    { name: 'NEXT', method: 'POST', url: '/next' },
    { name: 'PREVIOUS', method: 'POST', url: '/previous' },
  ]

  commands.forEach(({ name, method, url }) => {
    it(`should handle ${name} command correctly`, async () => {
      mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
      const req = new NextRequest('http://localhost/api/spotify/control', {
        method: 'POST',
        body: JSON.stringify({ command: name, deviceId: 'test-device' }),
      })
      const response = await POST(req)
      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.spotify.com/v1/me/player${url}?device_id=test-device`,
        expect.objectContaining({
          method,
          headers: {
            Authorization: 'Bearer fake-token',
            'Content-Type': 'application/json',
          },
        })
      )
    })
  })

  it('should handle SET_VOLUME command correctly', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    const req = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({
        command: 'SET_VOLUME',
        volume: 50,
        deviceId: 'test-device',
      }),
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=50&device_id=test-device',
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('should return 500 if volume is missing for SET_VOLUME', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    const req = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'SET_VOLUME' }),
    })
    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data.details).toBe('Volume required for SET_VOLUME')
  })

  it('should handle TRANSFER_PLAYBACK command correctly', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    const req = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({
        command: 'TRANSFER_PLAYBACK',
        deviceId: 'test-device',
      }),
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ device_ids: ['test-device'], play: true }),
      })
    )
  })

  it('should return an error if Spotify API fails', async () => {
    mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Device not found'),
    })
    const req = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'PLAY' }),
    })
    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(404)
    expect(data.error).toBe('Spotify API error')
    expect(data.details).toBe('Device not found')
  })
})
