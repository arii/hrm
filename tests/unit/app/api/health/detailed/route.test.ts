/**
 * @jest-environment node
 */
import { GET } from '../../../../../../app/api/health/detailed/route'
import * as healthCheck from '../../../../../../lib/healthCheck'

// Mock the healthCheck module
jest.mock('../../../../../../lib/healthCheck')

global.fetch = jest.fn()

describe('/api/health/detailed', () => {
  const mockedHealthCheck = healthCheck as jest.Mocked<typeof healthCheck>

  beforeAll(() => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  afterAll(() => {
    delete process.env.NEXTAUTH_URL
  })

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should return a healthy response when all checks pass', async () => {
    // Arrange
    mockedHealthCheck.checkMemoryUsage.mockReturnValue({
      healthy: true,
      details: {},
    })
    mockedHealthCheck.checkSpotifyAPI.mockResolvedValue({
      healthy: true,
      details: {},
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ healthy: true, details: {} }),
    })

    // Act
    const response = await GET()

    // Assert
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.status).toBe('healthy')
  })

  it('should return a degraded response when one check fails', async () => {
    // Arrange
    mockedHealthCheck.checkMemoryUsage.mockReturnValue({
      healthy: true,
      details: {},
    })
    mockedHealthCheck.checkSpotifyAPI.mockResolvedValue({
      healthy: false, // Spotify check fails
      details: {},
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ healthy: true, details: {} }),
    })

    // Act
    const response = await GET()

    // Assert
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
  })

  it('should return an unhealthy response when multiple checks fail', async () => {
    // Arrange
    mockedHealthCheck.checkMemoryUsage.mockReturnValue({
      healthy: true,
      details: {},
    })
    mockedHealthCheck.checkSpotifyAPI.mockResolvedValue({
      healthy: false, // Spotify check fails
      details: {},
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ healthy: false, details: {} }), // Internal services fail
    })

    // Act
    const response = await GET()

    // Assert
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.status).toBe('unhealthy')
  })
})
