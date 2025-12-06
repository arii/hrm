// File: tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager, SpotifyTokenPayload } from '../../../services/spotifyTokenManager';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('SpotifyTokenManager', () => {
  const clientId = 'test_client_id';
  const clientSecret = 'test_client_secret';
  let tokenManager: SpotifyTokenManager;

  beforeEach(() => {
    tokenManager = new SpotifyTokenManager(clientId, clientSecret);
    jest.spyOn(global, 'fetch').mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with no token', async () => {
    expect(await tokenManager.getValidAccessToken()).toBeNull();
    expect(tokenManager.getUserId()).toBeNull();
  });

  it('should set and retrieve a token payload', async () => {
    const tokenPayload: SpotifyTokenPayload = {
      provider: 'spotify',
      sub: 'test_user',
      access_token: 'access_token',
      refresh_token: 'refresh_token',
      expires_in: 3600,
      scope: 'test_scope',
      obtainedAt: Date.now(),
    };

    tokenManager.setToken(tokenPayload);
    expect(tokenManager.getUserId()).toBe('test_user');
    expect(await tokenManager.getValidAccessToken()).toBe('access_token');
  });

  it('should refresh the access token if it is expired', async () => {
    const now = Date.now();
    const expiredTokenPayload: SpotifyTokenPayload = {
      provider: 'spotify',
      sub: 'test_user',
      access_token: 'access_token',
      refresh_token: 'refresh_token',
      expires_in: 3600,
      scope: 'test_scope',
      obtainedAt: now - 3601 * 1000, // Expired
    };

    tokenManager.setToken(expiredTokenPayload);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
        }),
    });

    const accessToken = await tokenManager.getValidAccessToken();

    expect(global.fetch).toHaveBeenCalled();
    expect(accessToken).toBe('new_access_token');
    expect(tokenManager.getCurrentRefreshToken()).toBe('new_refresh_token');
  });

  it('should not refresh the access token if it is still valid', async () => {
    const now = Date.now();
    const validTokenPayload: SpotifyTokenPayload = {
      provider: 'spotify',
      sub: 'test_user',
      access_token: 'valid_access_token',
      refresh_token: 'valid_refresh_token',
      expires_in: 3600,
      scope: 'test_scope',
      obtainedAt: now, // Not expired
    };

    tokenManager.setToken(validTokenPayload);
    (global.fetch as jest.Mock).mockClear();

    const accessToken = await tokenManager.getValidAccessToken();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(accessToken).toBe('valid_access_token');
  });
});
