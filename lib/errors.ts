/**
 * Custom error class for Spotify API errors.
 * This allows for more specific error handling and provides additional context.
 */
export class SpotifyApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SpotifyApiError'
    this.status = status
  }
}
