import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import fs from 'fs'

// Mock the 'fs' module
jest.mock('fs')

// Mock fetch globally
global.fetch = jest.fn()

describe('SpotifyTokenManager', () => {
  let tokenManager: SpotifyTokenManager
  const clientId = 'test_client_id'
  const clientSecret = 'test_client_secret'

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = clientId
    process.env.SPOTIFY_CLIENT_SECRET = clientSecret

    tokenManager = new SpotifyTokenManager(clientId, clientSecret)
  })

  describe('Initialization', () => {
    it('should initialize without a token if no file exists', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      tokenManager = new SpotifyTokenManager(clientId, clientSecret)
      expect(tokenManager.getUserId()).toBeNull()
    })

    it('should load a token from file if it exists', () => {
      const mockToken = {
        receivedAt: Date.now(),
        payload: {
          sub: 'test_user',
          access_token: 'access_token',
          refresh_token: 'refresh_token',
          expires_in: 3600,
          obtainedAt: Date.now(),
        },
      }
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToken))
      tokenManager = new SpotifyTokenManager(clientId, clientSecret)
      expect(tokenManager.getUserId()).toBe('test_user')
    })
  })

  describe('Token Refresh', () => {
    it('should refresh the token if it is expired', async () => {
      const mockToken = {
        receivedAt: Date.now(),
        payload: {
          sub: 'test_user',
          access_token: 'access_token',
          refresh_token: 'refresh_token',
          expires_in: 0, // Expired
          obtainedAt: Date.now() - 4000 * 1000,
        },
      }
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToken))
      tokenManager = new SpotifyTokenManager(clientId, clientSecret)

      const newAccessToken = 'new_access_token'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: newAccessToken,
          expires_in: 3600,
        }),
      })

      const accessToken = await tokenManager.getValidAccessToken()
      expect(accessToken).toBe(newAccessToken)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should not refresh the token if it is not expired', async () => {
        const mockToken = {
            receivedAt: Date.now(),
            payload: {
              sub: 'test_user',
              access_token: 'access_token',
              refresh_token: 'refresh_token',
              expires_in: 3600,
              obtainedAt: Date.now(),
            },
          }
          ;(fs.existsSync as jest.Mock).mockReturnValue(true)
          ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockToken))
          tokenManager = new SpotifyTokenManager(clientId, clientSecret)

          const accessToken = await tokenManager.getValidAccessToken()
          expect(accessToken).toBe('access_token')
          expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
