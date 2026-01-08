/**
 * @jest-environment node
 */
import { POST } from '@/app/api/internal/token-delivery/route'
import { serviceContainer } from '@/lib/serviceContainer'
import { SpotifyPolling } from '@/services/spotifyPolling'
import { NextRequest } from 'next/server'
import { AccessToken } from '@spotify/web-api-ts-sdk'

// Mock the service container
jest.mock('@/lib/serviceContainer', () => ({
  serviceContainer: {
    get: jest.fn(),
  },
}))

describe('POST /api/internal/token-delivery', () => {
  let mockSpotifyService: jest.Mocked<SpotifyPolling>
  const MOCK_TOKEN_SECRET = 'my-super-secret-internal-token'
  const MOCK_ACCESS_TOKEN: AccessToken = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock the SpotifyPolling service
    mockSpotifyService = {
      handleTokenUpdate: jest.fn().mockResolvedValue(undefined),
    } as any

    // Configure the service container mock
    ;(serviceContainer.get as jest.Mock).mockReturnValue(mockSpotifyService)

    // Set the environment variable for the secret
    process.env.INTERNAL_TOKEN_DELIVERY_SECRET = MOCK_TOKEN_SECRET
  })

  it('should return 401 Unauthorized if the secret is missing', async () => {
    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(MOCK_ACCESS_TOKEN),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized: Missing or invalid secret.')
  })

  it('should return 401 Unauthorized if the secret is invalid', async () => {
    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': 'invalid-secret',
      },
      body: JSON.stringify(MOCK_ACCESS_TOKEN),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized: Missing or invalid secret.')
  })

  it('should return 400 Bad Request if the token data is missing', async () => {
    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': MOCK_TOKEN_SECRET,
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Bad Request: Missing token data.')
  })

  it('should call the spotifyService.handleTokenUpdate with the correct token data on success', async () => {
    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': MOCK_TOKEN_SECRET,
      },
      body: JSON.stringify(MOCK_ACCESS_TOKEN),
    })

    await POST(request)

    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      })
    )
  })

  it('should return 200 OK on successful token delivery', async () => {
    const request = new NextRequest('http://localhost/api/internal/token-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': MOCK_TOKEN_SECRET,
      },
      body: JSON.stringify(MOCK_ACCESS_TOKEN),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe('Token delivered successfully.')
  })
})
