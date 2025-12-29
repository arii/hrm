import express from 'express'
import request from 'supertest'
import { createTokenDeliveryHandler } from '../../lib/api-handlers'
import { AppServices } from '../../lib/services'
import logger from '../../utils/logger'

// Mock logger to suppress output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('POST /api/internal/token-delivery', () => {
  let app: express.Express
  let mockServices: Partial<AppServices>
  let mockSpotifyService: {
    handleTokenUpdate: jest.Mock
    isReady: jest.Mock
  }

  beforeEach(() => {
    app = express()
    app.use(express.json()) // Ensure body parsing middleware is used

    process.env.NEXTAUTH_SECRET = 'test-secret'

    mockSpotifyService = {
      handleTokenUpdate: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
    }

    mockServices = {
      spotifyService: mockSpotifyService as any,
    }

    // Register the route with the handler
    app.post(
      '/api/internal/token-delivery',
      createTokenDeliveryHandler(mockServices as AppServices)
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.NEXTAUTH_SECRET
  })

  it('should return 400 if refresh_token is missing', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ access_token: 'some-token' })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toEqual('Invalid request body.')
        expect(res.body.issues.refresh_token).toContain('Required')
      })
  })

  it('should return 400 if refresh_token is not a string', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ refresh_token: 12345 })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toEqual('Invalid request body.')
        expect(res.body.issues.refresh_token).toContain(
          'Expected string, received number'
        )
      })
  })

  it('should return 400 if body is not an object', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send('not-an-object')
      .expect(400)
  })

  it('should return 400 if access_token is not a string', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ refresh_token: 'valid-token', access_token: 12345 })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toEqual('Invalid request body.')
        expect(res.body.issues.access_token).toContain(
          'Expected string, received number'
        )
      })
  })

  it('should return 400 if expires_in is not a number', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ refresh_token: 'valid-token', expires_in: 'not-a-number' })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toEqual('Invalid request body.')
        expect(res.body.issues.expires_in).toContain(
          'Expected number, received string'
        )
      })
  })

  it('should return 400 if scope is not a string', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ refresh_token: 'valid-token', scope: true })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toEqual('Invalid request body.')
        expect(res.body.issues.scope).toContain(
          'Expected string, received boolean'
        )
      })
  })

  it('should return 401 if secret is missing', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .send({ refresh_token: 'a-token' })
      .expect(401)
      .then((res) => {
        expect(res.body).toEqual({ error: 'Unauthorized.' })
      })
  })

  it('should return 401 if secret is incorrect', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'wrong-secret')
      .send({ refresh_token: 'a-token' })
      .expect(401)
      .then((res) => {
        expect(res.body).toEqual({ error: 'Unauthorized.' })
      })
  })

  it('should return 401 if secret header is not a string and invalid', async () => {
    await request(app)
      .post('/api/internal/token-delivery')
      // supertest will convert this number to a string, but this tests that the
      // logic correctly handles a value that doesn't match the secret.
      .set('x-internal-token-secret', 12345 as any)
      .send({ refresh_token: 'a-token' })
      .expect(401)
      .then((res) => {
        expect(res.body).toEqual({ error: 'Unauthorized.' })
      })
  })

  it('should return 500 if NEXTAUTH_SECRET is not set', async () => {
    delete process.env.NEXTAUTH_SECRET
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ refresh_token: 'a-token' })
      .expect(500)
      .then((res) => {
        expect(res.body).toEqual({ error: 'Server misconfiguration.' })
      })
  })

  it('should return 503 if spotifyService is not ready', async () => {
    mockSpotifyService.isReady.mockReturnValue(false)
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({ refresh_token: 'a-token' })
      .expect(503)
      .then((res) => {
        expect(res.body).toEqual({ error: 'Spotify service is not available.' })
      })
  })

  it('should call handleTokenUpdate and return 200 on success', async () => {
    const tokenPayload = {
      refresh_token: 'valid-refresh-token',
      access_token: 'valid-access-token',
    }
    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send(tokenPayload)
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          ok: true,
          message: 'Token delivered successfully.',
        })
      })

    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining(tokenPayload)
    )
  })

  it('should handle errors during token update and return 500', async () => {
    const error = new Error('Service failure')
    mockSpotifyService.handleTokenUpdate.mockRejectedValue(error)

    await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'test-secret')
      .send({
        refresh_token: 'valid-refresh-token',
        access_token: 'valid-access-token',
      })
      .expect(500)
      .then((res) => {
        expect(res.body).toEqual({
          error: 'server_error',
          message: 'Service failure',
        })
      })

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, message: 'Service failure' },
      'Unhandled error in server-side token-delivery'
    )
  })
})
