const handleTokenUpdateMock = jest.fn();

jest.mock('../../services/spotifyPolling', () => ({
  SpotifyPolling: {
    create: jest.fn().mockResolvedValue({
      handleTokenUpdate: handleTokenUpdateMock,
    }),
  },
}));

import request from 'supertest';
import express from 'express';
import { setup } from '../../server';
import { API_INTERNAL_TOKEN_DELIVERY } from '../../constants/apiEndpoints';

describe('POST /api/internal/token-delivery', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await setup(app);
  });

  beforeEach(() => {
    handleTokenUpdateMock.mockClear();
  });

  it('should return 400 for an invalid token payload', async () => {
    const invalidPayload = {
      provider: 'spotify',
      sub: 'test-user',
      access_token: 'test-token',
      // Missing refresh_token, expires_in, scope, obtainedAt
    };

    const response = await request(app)
      .post(API_INTERNAL_TOKEN_DELIVERY)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid token payload.');
  });

  it('should return 200 for a valid token payload', async () => {
    const validPayload = {
      provider: 'spotify',
      sub: 'test-user',
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      scope: 'test-scope',
      obtainedAt: Date.now(),
    };

    const response = await request(app)
        .post(API_INTERNAL_TOKEN_DELIVERY)
        .send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Token updated successfully.');
    expect(handleTokenUpdateMock).toHaveBeenCalledWith(validPayload);
  });
});
