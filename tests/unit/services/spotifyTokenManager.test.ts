// File: tests/unit/services/spotifyTokenManager.test.ts
import {
  SpotifyTokenManager,
  TokenRecord,
} from '../../../services/spotifyTokenManager'
import fs from 'fs/promises'
import path from 'path'
import { EncryptionService } from '../../../utils/encryption'

jest.mock('fs/promises')
jest.mock('../../../utils/encryption', () => ({
  EncryptionService: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn((text) => Promise.resolve(text)),
    decrypt: jest.fn((text) => Promise.resolve(text)),
  })),
}))

describe('SpotifyTokenManager', () => {
  const logDir = '/tmp/logs'
  const tokenFile = path.join(logDir, 'spotify_tokens.json')
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'

  beforeEach(() => {
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockClear()
    ;(fs.writeFile as jest.Mock).mockClear()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should load tokens from file on initialization', async () => {
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
    }
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(tokenRecord))

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    await tokenManager.getValidAccessToken()
    expect(fs.readFile).toHaveBeenCalledWith(tokenFile, 'utf8')
    expect(tokenManager.getUserId()).toBe('test_user')
  })

  it('should refresh the access token if it is expired', async () => {
    const now = Date.now()
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now - 3600 * 1000, // Expired
      },
    }
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(tokenRecord))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
        }),
    })

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(accessToken).toBe('new_access_token')
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it('should not refresh the access token if it is still valid', async () => {
    const now = Date.now()
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
    }
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(tokenRecord))

    global.fetch = jest.fn()

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('access_token')
  })
})
