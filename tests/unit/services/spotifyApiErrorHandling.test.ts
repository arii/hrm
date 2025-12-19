/**
 * @jest-environment node
 */
import { handleSpotifyApiError } from '../../../services/spotifyApiErrorHandling'
import logger from '../../../utils/logger'

// Mock the logger to spy on its methods
jest.mock('../../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

describe('handleSpotifyApiError', () => {
  let onTokenExpiredMock: jest.Mock

  beforeEach(() => {
    // Reset mocks before each test
    onTokenExpiredMock = jest.fn()
    ;(logger.warn as jest.Mock).mockClear()
    ;(logger.error as jest.Mock).mockClear()
  })

  it('should handle 401 Unauthorized error and trigger token refresh', async () => {
    const error = { status: 401, message: 'Unauthorized' }
    const result = await handleSpotifyApiError(error, onTokenExpiredMock)

    expect(onTokenExpiredMock).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      'Spotify token expired during polling. Attempting refresh.'
    )
    expect(result).toBe(true)
  })

  it('should handle 429 Too Many Requests error', async () => {
    const error = { status: 429, message: 'Rate limit exceeded' }
    const result = await handleSpotifyApiError(error, onTokenExpiredMock)

    expect(onTokenExpiredMock).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      'Spotify API Rate Limited. Backing off.'
    )
    expect(result).toBe(true)
  })

  it('should handle 404 Not Found client-side error', async () => {
    const error = { status: 404, message: 'Device not found' }
    const result = await handleSpotifyApiError(error, onTokenExpiredMock)

    expect(onTokenExpiredMock).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      { status: 404, message: 'Device not found' },
      'Spotify API returned a client-side error. This may indicate a bug or configuration issue.'
    )
    expect(result).toBe(false)
  })

  it('should handle 503 Service Unavailable server-side error', async () => {
    const error = { status: 503, message: 'Service Unavailable' }
    const result = await handleSpotifyApiError(error, onTokenExpiredMock)

    expect(onTokenExpiredMock).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      { status: 503, message: 'Service Unavailable' },
      'Spotify API returned a server-side error. Service may be temporarily unavailable.'
    )
    expect(result).toBe(true)
  })

  it('should handle an unknown error without a status code', async () => {
    const error = new Error('Network Error')
    const result = await handleSpotifyApiError(error, onTokenExpiredMock)

    expect(onTokenExpiredMock).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: error }),
      'An unexpected error occurred during Spotify polling (e.g., network issue)'
    )
    expect(result).toBe(false)
  })

  it('should handle an error with a response text body', async () => {
    const error = {
      status: 500,
      response: {
        text: () => Promise.resolve('{ "error": "Internal Server Error" }'),
      },
    }
    const result = await handleSpotifyApiError(error, onTokenExpiredMock)
    expect(onTokenExpiredMock).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      { status: 500, message: undefined },
      'Spotify API returned a server-side error. Service may be temporarily unavailable.'
    )
    expect(result).toBe(true)
  })
})
