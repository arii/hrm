
import { SpotifyTokenManager } from '../../../services/spotifyTokenManager'
import fs from 'fs'
import path from 'path'
import logger from '../../../utils/logger.server'

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  renameSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}))

jest.mock('../../../utils/logger.server', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

const mockLogger = logger as jest.Mocked<typeof logger>
const mockedFs = fs as jest.Mocked<typeof fs>

const tokenFile = path.join(process.cwd(), 'logs', 'spotify_tokens.json')

const mockTokenRecord = {
  receivedAt: Date.now(),
  payload: {
    provider: 'spotify',
    sub: 'test_user',
    access_token: 'access_token',
    refresh_token: 'refresh_token',
    expires_in: 3600,
    scope: 'user-read-private',
    obtainedAt: Date.now(),
  },
}

describe('SpotifyTokenManager', () => {
  let tokenManager: SpotifyTokenManager

  beforeEach(() => {
    jest.clearAllMocks()
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should load tokens on initialization', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockTokenRecord))
    new SpotifyTokenManager('clientId', 'clientSecret')
    expect(mockLogger.info).toHaveBeenCalledWith(
      { userId: 'test_user' },
      'Loaded Spotify tokens'
    )
  })

  it('should get a valid access token', async () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockTokenRecord))
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const accessToken = await tokenManager.getValidAccessToken()
    expect(accessToken).toBe('access_token')
  })

  it('should refresh the token if it is expiring soon', async () => {
    const expiringToken = {
      ...mockTokenRecord,
      payload: {
        ...mockTokenRecord.payload,
        obtainedAt: Date.now() - 3540 * 1000, // 59 minutes ago
      },
    }
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(expiringToken))
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access_token',
          expires_in: 3600,
        }),
    })

    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Spotify access token is expiring soon, initiating refresh...'
    )
    expect(accessToken).toBe('new_access_token')
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Spotify access token refresh completed.'
    )
  })

  it('should handle token refresh failure', async () => {
    const expiringToken = {
      ...mockTokenRecord,
      payload: { ...mockTokenRecord.payload, obtainedAt: Date.now() - 3540 * 1000 },
    }
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(expiringToken))
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(accessToken).toBe('access_token')
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        attempt: 3,
        maxRetries: 3,
      }),
      'Failed to refresh Spotify token'
    )
  })

  it('should create a new token via setAccessToken if none exists', () => {
    mockedFs.existsSync.mockReturnValue(false)
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    tokenManager.setAccessToken('new_token')

    expect(mockedFs.writeFileSync).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Access token created via setAccessToken.'
    )
  })

  it('should update an existing token via setAccessToken', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockTokenRecord))
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    tokenManager.setAccessToken('updated_token')

    expect(mockedFs.writeFileSync).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Access token updated via setAccessToken.'
    )
  })

  it('should get user ID', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockTokenRecord))
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const userId = tokenManager.getUserId()
    expect(userId).toBe('test_user')
  })

  it('should return null for user ID if no token', () => {
    mockedFs.existsSync.mockReturnValue(false)
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const userId = tokenManager.getUserId()
    expect(userId).toBeNull()
  })

  it('should handle errors when loading a corrupt token file', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue('corrupt json')

    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const userId = tokenManager.getUserId()

    expect(userId).toBeNull()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { err: expect.any(SyntaxError) },
      'Failed to load Spotify tokens'
    )
  })

  it('should handle writeTokenFileSafe errors gracefully', () => {
    mockedFs.mkdirSync.mockImplementation(() => {
      throw new Error('Disk full')
    })
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    tokenManager.setAccessToken('some_token')

    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: new Error('Disk full') },
      'Failed to write token file safely'
    )
    expect(mockedFs.unlinkSync).toHaveBeenCalledWith(`${tokenFile}.tmp`)
  })

  it('should not refresh an expired token if no refresh token is available', async () => {
    const tokenWithoutRefresh = {
      ...mockTokenRecord,
      payload: {
        ...mockTokenRecord.payload,
        refresh_token: '',
        access_token: 'expired_access_token',
        obtainedAt: Date.now() - 3601 * 1000, // 1 hour 1 sec ago
      },
    }
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(tokenWithoutRefresh))
    tokenManager = new SpotifyTokenManager('clientId', 'clientSecret')
    const accessToken = await tokenManager.getValidAccessToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(accessToken).toBe('expired_access_token')
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Spotify access token expired, but no refresh token available. Cannot refresh.'
    )
  })
})
