import type { Request, Response } from 'express'
import { createTokenDeliveryHandler } from '../../lib/api-handlers'
import { AppServices } from '../../lib/services'
import logger from '../../utils/logger'
import { PassThrough } from 'stream'

// Mock logger to suppress output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('createTokenDeliveryHandler', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockServices: Partial<AppServices>
  let mockSpotifyService: {
    handleTokenUpdate: jest.Mock
    isReady: jest.Mock
  }

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret'
    mockSpotifyService = {
      handleTokenUpdate: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
    }

    mockServices = {
      spotifyService: mockSpotifyService as any,
    }

    mockRequest = {
      headers: {
        'x-internal-token-secret': 'test-secret',
      },
      body: {
        refresh_token: 'valid-refresh-token',
        access_token: 'valid-access-token',
      },
    }

    // Mock Express Response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.NEXTAUTH_SECRET
  })

  const callHandler = () => {
    const handler = createTokenDeliveryHandler(mockServices as AppServices)
    return handler(mockRequest as Request, mockResponse as Response)
  }

  it('should return 400 if refresh_token is missing', async () => {
    delete mockRequest.body.refresh_token
    await callHandler()
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing refresh_token.',
    })
  })

  it('should return 401 if secret is missing', async () => {
    delete mockRequest.headers['x-internal-token-secret']
    await callHandler()
    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized.' })
  })

  it('should return 401 if secret is incorrect', async () => {
    mockRequest.headers['x-internal-token-secret'] = 'wrong-secret'
    await callHandler()
    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized.' })
  })

  it('should return 500 if NEXTAUTH_SECRET is not set', async () => {
    delete process.env.NEXTAUTH_SECRET
    await callHandler()
    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Server misconfiguration.',
    })
    expect(logger.error).toHaveBeenCalledWith(
      'NEXTAUTH_SECRET is not set. Refusing token delivery.'
    )
  })

  it('should return 503 if spotifyService is not ready', async () => {
    mockSpotifyService.isReady.mockReturnValue(false)
    await callHandler()
    expect(mockResponse.status).toHaveBeenCalledWith(503)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Spotify service is not available.',
    })
    expect(logger.warn).toHaveBeenCalledWith(
      'Internal token delivery failed: Spotify service not available.'
    )
  })

  it('should call handleTokenUpdate and return 200 on success', async () => {
    await callHandler()
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh_token: 'valid-refresh-token',
        access_token: 'valid-access-token',
      })
    )
    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({
      ok: true,
      message: 'Token delivered successfully.',
    })
  })

  it('should handle errors during token update and return 500', async () => {
    const error = new Error('Service failure')
    mockSpotifyService.handleTokenUpdate.mockRejectedValue(error)
    await callHandler()
    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'server_error',
      message: 'Service failure',
    })
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, message: 'Service failure' },
      'Unhandled error in server-side token-delivery'
    )
  })
})
