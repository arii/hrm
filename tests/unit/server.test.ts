// tests/unit/server.test.ts
import request from 'supertest'
import express from 'express'
import { serviceContainer } from '@/lib/serviceContainer'
import { SpotifyPolling } from '@/services/spotifyPolling'

// Mock the service container
jest.mock('@/lib/serviceContainer', () => ({
  serviceContainer: {
    get: jest.fn(),
  },
}))

// Mock the logger
jest.mock('@/utils/logger.server', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const app = express()
const internalApiSecretMiddleware = (req, res, next) => {
  if (req.headers['x-internal-secret'] !== 'test-secret') {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

app.post('/api/internal/sync-token', internalApiSecretMiddleware, express.json(), (req, res) => {
  const { accessToken } = req.body
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' })
  }

  try {
    const spotifyService = serviceContainer.get('spotifyService')
    spotifyService.setAccessToken(accessToken)
    res.status(200).json({ message: 'Token synced successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

describe('Internal API', () => {
  let mockSpotifyService: Partial<SpotifyPolling>

  beforeEach(() => {
    mockSpotifyService = {
      setAccessToken: jest.fn(),
    }
    ;(serviceContainer.get as jest.Mock).mockReturnValue(mockSpotifyService)
  })

  it('should sync the token successfully', async () => {
    const response = await request(app)
      .post('/api/internal/sync-token')
      .set('x-internal-secret', 'test-secret')
      .send({ accessToken: 'test-token' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ message: 'Token synced successfully' })
    expect(mockSpotifyService.setAccessToken).toHaveBeenCalledWith('test-token')
  })

  it('should return 401 if the secret is invalid', async () => {
    const response = await request(app)
      .post('/api/internal/sync-token')
      .set('x-internal-secret', 'invalid-secret')
      .send({ accessToken: 'test-token' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('should return 400 if the access token is missing', async () => {
    const response = await request(app)
      .post('/api/internal/sync-token')
      .set('x-internal-secret', 'test-secret')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Access token is required' })
  })
})
