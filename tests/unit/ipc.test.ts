import express from 'express'
import request from 'supertest'
import { Server } from 'http'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenPayloadSchema } from '../../lib/validation/schemas'
import logger from '../../utils/logger'
import { createTokenUpdateHandler } from '../../lib/ipc/tokenUpdateHandler'

// Mock dependencies
const mockSpotifyService = {
  handleTokenUpdate: jest.fn(),
}

jest.mock('../../services/spotifyPolling.js', () => ({
  SpotifyPolling: {
    create: jest.fn().mockResolvedValue(mockSpotifyService),
  },
}))

jest.mock('../../utils/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

describe('IPC Endpoint', () => {
  let app: express.Express
  let server: Server

  beforeAll((done) => {
    app = express()
    app.use(express.json())

    // Mount the IPC endpoint handler
    app.post(
      '/api/internal/ipc/token-update',
      createTokenUpdateHandler(mockSpotifyService as unknown as SpotifyPolling)
    )

    server = app.listen(done)
  })

  afterAll((done) => {
    server.close(done)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_TOKEN_DELIVERY_SECRET = 'test-secret'
  })

  const validPayload = {
    access_token: 'test-access-token',
    expires_in: 3600,
    refresh_token: 'test-refresh-token',
    scope: 'test-scope',
    token_type: 'Bearer',
  }

  it('should return 401 if secret is missing', async () => {
    await request(app)
      .post('/api/internal/ipc/token-update')
      .send({ timestamp: Date.now(), payload: validPayload })
      .expect(401)
  })

  it('should return 401 if secret is incorrect', async () => {
    await request(app)
      .post('/api/internal/ipc/token-update')
      .set('x-internal-token-secret', 'wrong-secret')
      .send({ timestamp: Date.now(), payload: validPayload })
      .expect(401)
  })

  it('should return 400 if timestamp is missing', async () => {
    await request(app)
      .post('/api/internal/ipc/token-update')
      .set('x-internal-token-secret', 'test-secret')
      .send({ payload: validPayload })
      .expect(400)
  })

  it('should return 400 if timestamp is stale', async () => {
    await request(app)
      .post('/api/internal/ipc/token-update')
      .set('x-internal-token-secret', 'test-secret')
      .send({ timestamp: Date.now() - 60000, payload: validPayload })
      .expect(400)
  })

  it('should return 400 if payload is invalid', async () => {
    await request(app)
      .post('/api/internal/ipc/token-update')
      .set('x-internal-token-secret', 'test-secret')
      .send({ timestamp: Date.now(), payload: { invalid: 'payload' } })
      .expect(400)
  })

  it('should call handleTokenUpdate with the correct payload on success', async () => {
    await request(app)
      .post('/api/internal/ipc/token-update')
      .set('x-internal-token-secret', 'test-secret')
      .send({ timestamp: Date.now(), payload: validPayload })
      .expect(200)

    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(validPayload)
  })

  it('should retry if handleTokenUpdate fails', async () => {
    mockSpotifyService.handleTokenUpdate
      .mockRejectedValueOnce(new Error('test error'))
      .mockResolvedValueOnce(undefined)

    await request(app)
      .post('/api/internal/ipc/token-update')
      .set('x-internal-token-secret', 'test-secret')
      .send({ timestamp: Date.now(), payload: validPayload })
      .expect(200)

    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledTimes(2)
  })
})
