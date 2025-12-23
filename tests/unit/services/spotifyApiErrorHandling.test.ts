/**
 * @jest-environment node
 */
import {
  handleSpotifyApiError,
  logSpotifyCommandError,
} from '../../../services/spotifyApiErrorHandling'
import logger from '../../../utils/logger'

// Mock logger
jest.mock('../../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('spotifyApiErrorHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logSpotifyCommandError', () => {
    it('should handle response with bodyUsed=true and not attempt to read text', async () => {
      const mockResponse = {
        bodyUsed: true,
        text: jest.fn(),
      }
      const error = {
        response: mockResponse,
      }

      await logSpotifyCommandError('TEST_COMMAND', error)

      expect(mockResponse.text).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'TEST_COMMAND',
          response: '[Response body already consumed]',
        }),
        'Error executing Spotify command'
      )
    })

    it('should read text if bodyUsed=false', async () => {
      const mockResponse = {
        bodyUsed: false,
        text: jest.fn().mockResolvedValue('{"error": "message"}'),
      }
      const error = {
        response: mockResponse,
      }

      await logSpotifyCommandError('TEST_COMMAND', error)

      expect(mockResponse.text).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'TEST_COMMAND',
          response: { error: 'message' },
        }),
        'Error executing Spotify command'
      )
    })
  })

  describe('handleSpotifyApiError', () => {
    it('should handle response with bodyUsed=true and not attempt to read text', async () => {
      const mockResponse = {
        bodyUsed: true,
        text: jest.fn(),
      }
      const error = {
        response: mockResponse,
        status: 500,
      }

      await handleSpotifyApiError(error, jest.fn())

      expect(mockResponse.text).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          response: '[Response body already consumed]',
        }),
        'Unhandled Spotify API error during polling'
      )
    })
  })
})
