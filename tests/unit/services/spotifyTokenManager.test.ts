// File: tests/unit/services/spotifyTokenManager.test.ts
import { SpotifyTokenManager, TokenRecord } from '../../../services/spotifyTokenManager';
import fs from 'fs';
import path from 'path';

jest.mock('fs');

describe('SpotifyTokenManager', () => {
  const logDir = '/tmp/logs';
  const tokenFile = path.join(logDir, 'spotify_tokens.json');
  const clientId = 'test_client_id';
  const clientSecret = 'test_client_secret';

  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
    jest.clearAllMocks();
  });

  it('should load tokens from file on initialization', () => {
    const tokenRecord: TokenRecord = {
      receivedAt: Date.now(),
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: Date.now(),
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    expect(fs.readFileSync).toHaveBeenCalledWith(tokenFile, 'utf8');
    expect(tokenManager.getUserId()).toBe('test_user');
  });

  it('should handle failure to load tokens', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Read error');
    });
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    new SpotifyTokenManager(clientId, clientSecret, logDir);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load Spotify tokens:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should refresh the access token if it is expired', async () => {
    const now = Date.now();
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now - 3600 * 1000 - 60000, // Expired
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'new_access_token',
        expires_in: 3600,
        refresh_token: 'new_refresh_token',
      }),
    });

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    const accessToken = await tokenManager.getValidAccessToken();

    expect(global.fetch).toHaveBeenCalled();
    expect(accessToken).toBe('new_access_token');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should not refresh the access token if it is still valid', async () => {
    const now = Date.now();
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now, // Not expired
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    global.fetch = jest.fn();

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    const accessToken = await tokenManager.getValidAccessToken();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(accessToken).toBe('access_token');
  });

  it('should manually set access token (existing token)', () => {
    const tokenRecord: TokenRecord = {
      receivedAt: Date.now(),
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: Date.now(),
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    tokenManager.setAccessToken('manual_token');

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const savedData = JSON.parse(writeCall[1]);
    expect(savedData.payload.access_token).toBe('manual_token');
  });

  it('should manually set access token (no existing token)', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    tokenManager.setAccessToken('manual_token');

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const savedData = JSON.parse(writeCall[1]);
    expect(savedData.payload.access_token).toBe('manual_token');
    expect(savedData.payload.sub).toBe('manual');
  });

  it('should return null access token if no token exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    expect(await tokenManager.getValidAccessToken()).toBeNull();
  });

  it('should handle refresh failure (fetch error)', async () => {
    const now = Date.now();
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now - 3600 * 1000 - 60000,
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    const accessToken = await tokenManager.getValidAccessToken();

    expect(accessToken).toBe('access_token'); // Returns old token even if refresh fails
    expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh Spotify token:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should catch errors in getValidAccessToken if refreshToken throws', async () => {
    const now = Date.now();
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now - 3600 * 1000 - 60000,
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);

    // Mock private method refreshToken to reject
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tokenManager as any).refreshToken = jest.fn().mockRejectedValue(new Error('Critical failure'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await tokenManager.getValidAccessToken();

    expect(consoleSpy).toHaveBeenCalledWith('Spotify access token refresh failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should handle refresh failure (HTTP error)', async () => {
    const now = Date.now();
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now - 3600 * 1000 - 60000,
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    await tokenManager.getValidAccessToken();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh Spotify token:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should return correct refresh token', () => {
    const tokenRecord: TokenRecord = {
      receivedAt: Date.now(),
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: Date.now(),
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    expect(tokenManager.getCurrentRefreshToken()).toBe('refresh_token');
  });

  it('should return null refresh token if no token exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    expect(tokenManager.getCurrentRefreshToken()).toBeNull();
  });

  it('should return SDK access token object', () => {
    const now = Date.now();
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now,
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    const sdkToken = tokenManager.getSdkAccessToken();

    expect(sdkToken).toEqual({
      access_token: 'access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh_token',
      expires: now + 3600 * 1000,
    });
  });

  it('should return null SDK access token if no token exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);
    expect(tokenManager.getSdkAccessToken()).toBeNull();
  });

  it('should return false if no refresh token is available when refreshing', async () => {
      const now = Date.now();
      const tokenRecord: TokenRecord = {
        receivedAt: now,
        payload: {
          provider: 'spotify',
          sub: 'test_user',
          access_token: 'access_token',
          refresh_token: '', // No refresh token
          expires_in: 3600,
          scope: 'test_scope',
          obtainedAt: now - 7200 * 1000, // Expired
        },
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord));

      const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir);

      // We need to access the private method or trigger it via getValidAccessToken
      // getValidAccessToken calls refreshToken() which returns void (in the promise chain)
      // but we want to verify the internal logic of refreshToken returning false.
      // Since we can't easily access private methods, we'll verify behavior:
      // it should NOT call fetch.

      global.fetch = jest.fn();
      await tokenManager.getValidAccessToken();

      expect(global.fetch).not.toHaveBeenCalled();
  });
});
