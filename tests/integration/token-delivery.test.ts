import request from 'supertest';
import express from 'express';
import { serviceContainer } from '@/lib/serviceContainer';
import { env } from '@/lib/env';
import { TokenPayload } from '@/types';

// Mock spotifyService
const mockSpotifyService = {
  isReady: jest.fn().mockReturnValue(true),
  handleTokenUpdate: jest.fn().mockResolvedValue(undefined),
};

describe('POST /api/internal/token-delivery', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceContainer.register('spotifyService', mockSpotifyService);

    app = express();
    app.use(express.json());

    // Simplified handler from server.ts for testing
    app.post('/api/internal/token-delivery', async (req, res) => {
        const tokenData = req.body;
        if (!tokenData.refresh_token) {
            return res.status(400).json({ error: 'Missing refresh_token.' });
        }

        const rawHeader = req.headers['x-internal-token-secret'];
        const secretHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader || '';
        const expected = env.NEXTAUTH_SECRET || '';
        const crypto = require('crypto');

        const isValid = secretHeader.length === expected.length &&
            crypto.timingSafeEqual(Buffer.from(secretHeader), Buffer.from(expected));

        if (!isValid) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const spotifyService = serviceContainer.get('spotifyService');
        if (!spotifyService || !spotifyService.isReady()) {
            return res.status(503).json({ error: 'Spotify service is not available.' });
        }

        await spotifyService.handleTokenUpdate({
          ...tokenData,
          access_token: tokenData.access_token || '',
          expires_in: tokenData.expires_in || 0,
        } as TokenPayload);

        return res.status(200).json({ ok: true, message: 'Token delivered successfully.' });
    });
  });

  it('should return 200 OK for a valid token and secret', async () => {
    const response = await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', env.NEXTAUTH_SECRET)
      .send({ refresh_token: 'test-refresh-token', access_token: 'test-access-token', expires_in: 3600 });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(mockSpotifyService.handleTokenUpdate).toHaveBeenCalledWith({
        refresh_token: 'test-refresh-token',
        access_token: 'test-access-token',
        expires_in: 3600,
    });
  });

  it('should return 401 Unauthorized for an invalid secret', async () => {
    const response = await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', 'invalid-secret')
      .send({ refresh_token: 'test-refresh-token' });

    expect(response.status).toBe(401);
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled();
  });

  it('should return 400 Bad Request if refresh_token is missing', async () => {
    const response = await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', env.NEXTAUTH_SECRET)
      .send({ expires_in: 3600 });

    expect(response.status).toBe(400);
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled();
  });

  it('should return 503 Service Unavailable if spotifyService is not ready', async () => {
    mockSpotifyService.isReady.mockReturnValue(false);
    const response = await request(app)
      .post('/api/internal/token-delivery')
      .set('x-internal-token-secret', env.NEXTAUTH_SECRET)
      .send({ refresh_token: 'test-refresh-token' });

    expect(response.status).toBe(503);
    expect(mockSpotifyService.handleTokenUpdate).not.toHaveBeenCalled();
  });
});