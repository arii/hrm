// tests/integration/app/api/internal/token-delivery/route.test.ts
import { POST } from '@/app/api/internal/token-delivery/route'
import { serviceContainer } from '@/lib/serviceContainer'
import { SpotifyPolling } from '@/services/spotifyPolling'
import { AccessToken } from '@spotify/web-api-ts-sdk'
import { NextRequest } from 'next/server'
import { mock, MockProxy } from 'jest-mock-extended'

// Mock the logger to suppress console output during tests
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('POST /api/internal/token-delivery', () => {
  let mockSpotifyService: MockProxy<SpotifyPolling>
  const VALID_SECRET = 'a-very-secure-secret-that-is-long-enough'
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to clear any cached environment variables
    jest.resetModules()
    process.env = { ...originalEnv }

    // Mock the SpotifyPolling service
    mockSpotifyService = mock<SpotifyPolling>()
    // Set the mock in the service container
    serviceContainer.register('spotifyService', mockSpotifyService)
  })

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv
    // Clear any mocks on the service container
    serviceContainer.reset()
  })

  it('should return 200 OK and update the token on a successful request', async () => {
    // Arrange
    process.env.NEXTAUTH_SECRET = VALID_SECRET
    const tokenData: AccessToken = {
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test_refresh_token',
      scope: 'user-read-private',
    }

    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': VALID_SECRET,
      },
      body: JSON.stringify(tokenData),
    })

    // Act
    const response = await POST(request)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.message).toBe('Token delivered successfully.')

    // Verify that the service's token update method was called correctly
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledTimes(1)
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...tokenData,
        provider: 'spotify',
        scope: '',
      })
    )
  })

  it('should return 401 Unauthorized if the secret header is missing', async () => {
    // Arrange
    process.env.NEXTAUTH_SECRET = VALID_SECRET
    const tokenData: AccessToken = {
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test_refresh_token',
      scope: 'user-read-private',
    }

    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No 'x-internal-token-secret' header
      },
      body: JSON.stringify(tokenData),
    })

    // Act
    const response = await POST(request)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized: Missing or invalid secret.')
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled()
  })

  it('should return 401 Unauthorized if the secret header is invalid', async () => {
    // Arrange
    process.env.NEXTAUTH_SECRET = VALID_SECRET
    const tokenData: AccessToken = {
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test_refresh_token',
      scope: 'user-read-private',
    }

    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': 'invalid-secret',
      },
      body: JSON.stringify(tokenData),
    })

    // Act
    const response = await POST(request)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized: Missing or invalid secret.')
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled()
  })

  it('should return 400 Bad Request if the token data is invalid', async () => {
    // Arrange
    process.env.NEXTAUTH_SECRET = VALID_SECRET
    const invalidTokenData = {
      // Missing refresh_token
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-read-private',
    }

    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': VALID_SECRET,
      },
      body: JSON.stringify(invalidTokenData),
    })

    // Act
    const response = await POST(request)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(body.error).toBe('Bad Request: Missing token data.')
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled()
  })

  it('should return 500 Internal Server Error if the spotifyService is not available', async () => {
    // Arrange
    process.env.NEXTAUTH_SECRET = VALID_SECRET
    // Unregister the service to simulate it being unavailable
    serviceContainer.register('spotifyService', undefined as any)

    const tokenData: AccessToken = {
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test_refresh_token',
      scope: 'user-read-private',
    }

    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': VALID_SECRET,
      },
      body: JSON.stringify(tokenData),
    })

    // Act
    const response = await POST(request)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(body.error).toBe('server_error')
  })

  it('should return 500 Internal Server Error if NEXTAUTH_SECRET is not set', async () => {
    // Arrange
    delete process.env.NEXTAUTH_SECRET

    const tokenData: AccessToken = {
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test_refresh_token',
      scope: 'user-read-private',
    }

    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': VALID_SECRET,
      },
      body: JSON.stringify(tokenData),
    })

    // Act
    const response = await POST(request)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(body.error).toBe('NEXTAUTH_SECRET is not set.')
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled()
  })
})
