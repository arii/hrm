/**
 * Manual mock for SpotifyTokenManager
 */
import { jest } from '@jest/globals'
import { AccessToken } from '@spotify/web-api-ts-sdk'

export const SpotifyTokenManager = jest.fn().mockImplementation(() => {
  return {
    getValidAccessToken: jest
      .fn()
      .mockResolvedValue('test_access_token'),
    getSdkAccessToken: jest.fn().mockReturnValue({
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh_token',
    } as AccessToken),
    stopPolling: jest.fn(),
    cleanup: jest.fn(),
  }
})
