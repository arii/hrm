import {
  logSpotifyCommandError,
  handleSpotifyApiError,
} from '@/lib/shared/utils/apiUtils'
import logger from '@/utils/logger'

// Mock the logger to spy on its methods
jest.mock('@/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('lib/shared/utils/apiUtils', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('logSpotifyCommandError', () => {
    it('should log a warning for a SyntaxError', async () => {
      const error = new SyntaxError('Unexpected token')
      await logSpotifyCommandError('test_command', error)
      expect(logger.warn).toHaveBeenCalledWith(
        { command: 'test_command' },
        'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
      )
    })

    it('should log the response text if available', async () => {
      const error = {
        response: {
          text: () => Promise.resolve('{ "error": "test_error" }'),
        },
      }
      await logSpotifyCommandError('test_command', error)
      expect(logger.error).toHaveBeenCalledWith(
        { command: 'test_command', response: { error: 'test_error' } },
        'Error executing Spotify command'
      )
    })

    it('should log a generic error if response text is not available', async () => {
      const error = new Error('test_error')
      await logSpotifyCommandError('test_command', error)
      expect(logger.error).toHaveBeenCalledWith(
        { command: 'test_command', err: error },
        'Error executing Spotify command'
      )
    })
  })

  describe('handleSpotifyApiError', () => {
    it('should handle a 429 rate limit error', async () => {
      const error = { status: 429 }
      const onTokenExpired = jest.fn()
      const result = await handleSpotifyApiError(error, onTokenExpired)
      expect(result).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        'Spotify API Rate Limited. Backing off...'
      )
      expect(onTokenExpired).not.toHaveBeenCalled()
    })

    it('should handle a 401 token expired error', async () => {
      const error = { status: 401 }
      const onTokenExpired = jest.fn()
      const result = await handleSpotifyApiError(error, onTokenExpired)
      expect(result).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        'Spotify token expired during polling. Attempting refresh.'
      )
      expect(onTokenExpired).toHaveBeenCalled()
    })

    it('should log the response text for other errors', async () => {
      const error = {
        status: 500,
        response: {
          text: () => Promise.resolve('{ "error": "internal_server_error" }'),
        },
      }
      const onTokenExpired = jest.fn()
      const result = await handleSpotifyApiError(error, onTokenExpired)
      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalledWith(
        { response: { error: 'internal_server_error' } },
        'Unhandled Spotify API error during polling'
      )
    })
  })
})
