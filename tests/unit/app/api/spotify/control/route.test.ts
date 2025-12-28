/**
 * @jest-environment node
 */
import { POST } from '@/app/api/spotify/control/route'
import { createMockRequestWithCsrf } from '@/tests/unit/test-helpers'
import { getServerSession } from 'next-auth/next'
import { MOCK_SESSION } from '@/tests/unit/mocks/session'

// Mock next-auth
jest.mock('next-auth/next')
const mockedGetServerSession = jest.mocked(getServerSession)

// Mock fetch
const mockedFetch = jest.fn()
global.fetch = mockedFetch

describe('API Route: /api/spotify/control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetServerSession.mockResolvedValue(MOCK_SESSION) // Default to having a valid session
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 204, // Spotify API often returns 204 No Content for successful commands
      json: () => Promise.resolve({}),
    })
  })

  it('should return 403 Forbidden if CSRF is invalid', async () => {
    // Arrange
    const req = {
      headers: { get: () => null },
      cookies: { get: () => undefined },
      json: async () => ({ command: 'PLAY', deviceId: 'test-device' }),
    }

    // Act
    const response = await POST(req as any)

    // Assert
    expect(response.status).toBe(403)
  })

  it('should return 401 Unauthorized if no session is found', async () => {
    // Arrange
    mockedGetServerSession.mockResolvedValue(null)
    const req = createMockRequestWithCsrf({
      command: 'PLAY',
      deviceId: 'test-device',
    })

    // Act
    const response = await POST(req as any)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe('Authorization required')
  })

  it('should return 400 Bad Request for an invalid command', async () => {
    // Arrange
    const req = createMockRequestWithCsrf({
      command: 'INVALID_COMMAND',
      deviceId: 'test-device',
    })

    // Act
    const response = await POST(req as any)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid command: INVALID_COMMAND')
  })

  it('should handle PLAY command successfully', async () => {
    // Arrange
    const req = createMockRequestWithCsrf({
      command: 'PLAY',
      deviceId: 'test-device',
    })

    // Act
    const response = await POST(req as any)

    // Assert
    expect(response.status).toBe(200)
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/play?device_id=test-device',
      expect.any(Object)
    )
  })

  it('should forward Spotify API errors', async () => {
    // Arrange
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { message: 'Device not found' } }),
    })
    const req = createMockRequestWithCsrf({
      command: 'PLAY',
      deviceId: 'non-existent-device',
    })

    // Act
    const response = await POST(req as any)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe('Spotify API error')
    expect(data.details).toBe('Device not found')
  })
})
