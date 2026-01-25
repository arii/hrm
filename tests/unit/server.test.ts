// tests/unit/server.test.ts
import express from 'express'
import request from 'supertest'
import { env } from '@/lib/env'
import { serviceContainer } from '@/lib/serviceContainer'
import { SpotifyPolling } from '@/services/spotifyPolling'

// Mock dependencies
jest.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret',
  },
}))

const mockSpotifyService = {
  handleTokenUpdate: jest.fn(),
}
serviceContainer.register('spotifyService', mockSpotifyService as any)

const app = express()
app.use(express.json())
app.post('/api/internal/sync-token', (req, res) => {
  const internalSecret = req.headers['x-internal-secret']
  if (internalSecret !== env.NEXTAUTH_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const tokenPayload = req.body
  if (
    !tokenPayload ||
    typeof tokenPayload !== 'object' ||
    !('access_token' in tokenPayload) ||
    !('refresh_token' in tokenPayload) ||
    !('sub' in tokenPayload)
  ) {
    return res.status(400).json({ error: 'Invalid or missing token payload' })
  }
  const spotifyService = serviceContainer.get('spotifyService') as SpotifyPolling
  if (spotifyService) {
    spotifyService.handleTokenUpdate(tokenPayload as any)
    return res.status(202).json({ message: 'Token received for sync.' })
  } else {
    return res.status(500).json({ error: 'Internal Server Error: Service not available' })
  }
})

describe('POST /api/internal/sync-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 403 if secret is invalid or missing', async () => {
    await request(app).post('/api/internal/sync-token').expect(403)
    await request(app).post('/api/internal/sync-token').set('x-internal-secret', 'wrong-secret').expect(403)
  })

  it('should return 400 if payload is invalid or missing', async () => {
    await request(app).post('/api/internal/sync-token').set('x-internal-secret', 'test-secret').expect(400)
    await request(app).post('/api/internal/sync-token').set('x-internal-secret', 'test-secret').send({}).expect(400)
  })

  it('should return 202 and call spotifyService.handleTokenUpdate if payload and secret are valid', async () => {
    const tokenPayload = {
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      sub: 'test-sub',
    }
    await request(app)
      .post('/api/internal/sync-token')
      .set('x-internal-secret', 'test-secret')
      .send(tokenPayload)
      .expect(202)
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith(tokenPayload)
  })
})
