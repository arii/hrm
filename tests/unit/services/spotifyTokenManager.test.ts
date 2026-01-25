// File: tests/unit/services/spotifyTokenManager.test.ts
import { jest } from '@jest/globals'
import {
  SpotifyTokenManager,
  TokenRecord,
} from '../../../services/spotifyTokenManager'
import fs from 'fs'
import path from 'path'
import logger from '../../../utils/logger.server.js'

jest.mock('../../../utils/logger.server.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  renameSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

describe('SpotifyTokenManager', () => {
  const logDir = '/tmp/logs'
  const tokenFile = path.join(logDir, 'spotify_tokens.json')
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'
  const mockedLogger = jest.mocked(logger)

  beforeEach(() => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)
    ;(fs.readFileSync as jest.Mock).mockClear()
    ;(fs.writeFileSync as jest.Mock).mockClear()
    mockedLogger.info.mockClear()
    mockedLogger.warn.mockClear()
    mockedLogger.error.mockClear()
    mockedLogger.debug.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

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
    }
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord))

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    expect(fs.readFileSync).toHaveBeenCalledWith(tokenFile, 'utf8')
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
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord))

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
    expect(fs.writeFileSync).toHaveBeenCalled()
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
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord))

    global.fetch = jest.fn()

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('access_token')
  })

  it('should handle token refresh failure', async () => {
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
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord))

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalledTimes(3)
    // It should return the old, expired token on failure
    expect(accessToken).toBe('access_token')
    expect(fs.writeFileSync).not.toHaveBeenCalled()
    expect(mockedLogger.error).toHaveBeenCalledWith(
      {
        err: expect.any(Error),
        attempt: 3,
        maxRetries: 3,
      },
      'Failed to refresh Spotify token'
    )
  })

  it('should set access token when one already exists', () => {
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
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord))

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    tokenManager.setAccessToken('new_manual_token')

    expect(fs.writeFileSync).toHaveBeenCalled()
    const writtenData = JSON.parse(
      (fs.writeFileSync as jest.Mock).mock.calls[0][1]
    )
    expect(writtenData.payload.access_token).toBe('new_manual_token')
  })

  it('should create a new token record via setAccessToken if none exists', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)
    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    tokenManager.setAccessToken('new_manual_token')

    expect(fs.writeFileSync).toHaveBeenCalled()
    const writtenData = JSON.parse(
      (fs.writeFileSync as jest.Mock).mock.calls[0][1]
    )
    expect(writtenData.payload.access_token).toBe('new_manual_token')
    expect(writtenData.payload.provider).toBe('manual')
  })

  it('should handle errors when loading a corrupt token file', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue('invalid json')

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const userId = tokenManager.getUserId()

    expect(userId).toBeNull()
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      { err: expect.any(SyntaxError) },
      'Failed to load Spotify tokens'
    )
  })

  it('should return null for access token if no token is available', async () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)
    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()
    expect(accessToken).toBeNull()
  })

  it('should handle writeTokenFileSafe errors gracefully', () => {
    const diskFullError = new Error('Disk full')
    ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw diskFullError
    })
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {})
    // Ensure the temp file is "found" to test the cleanup path
    ;(fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${tokenFile}.tmp`
    )

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    tokenManager.setAccessToken('some_token')

    expect(mockedLogger.error).toHaveBeenCalledWith(
      { err: diskFullError },
      'Failed to write token file safely'
    )
    expect(fs.unlinkSync).toHaveBeenCalledWith(`${tokenFile}.tmp`)
  })

  it('should not refresh an expired token if no refresh token is available', async () => {
    const now = Date.now()
    const tokenRecord: TokenRecord = {
      receivedAt: now,
      payload: {
        provider: 'spotify',
        sub: 'test_user',
        access_token: 'expired_access_token',
        refresh_token: '', // No refresh token
        expires_in: 3600,
        scope: 'test_scope',
        obtainedAt: now - 3600 * 1000, // Expired
      },
    }
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokenRecord))

    global.fetch = jest.fn()

    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('expired_access_token')
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Spotify access token expired, but no refresh token available.'
    )
  })

  it('should create the log directory recursively when writing a token', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)
    const tokenManager = new SpotifyTokenManager(clientId, clientSecret, logDir)
    tokenManager.setAccessToken('new_token')

    expect(fs.mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true })
    expect(fs.writeFileSync).toHaveBeenCalled()
  })
})
