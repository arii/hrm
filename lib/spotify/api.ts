import { SpotifyApiError } from '@/lib/errors'

/**
 * A centralized utility for making client-side calls to the Spotify API proxy.
 * It handles errors and provides a consistent interface for all Spotify API interactions.
 *
 * @param command - The Spotify command to execute.
 * @param body - The request body.
 * @param addError - A function to add an error to the global error context.
 * @returns - The response from the API.
 * @throws - Throws a `SpotifyApiError` if the API call fails.
 */
export const callSpotifyApi = async (
  command: string,
  body: Record<string, unknown>,
  addError: (message: string) => void
) => {
  try {
    const response = await fetch('/api/spotify/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, ...body }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage =
        errorData.error?.message || `Spotify API Error: ${response.status}`
      throw new SpotifyApiError(errorMessage, response.status)
    }

    return response
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      addError(error.message)
    } else {
      addError('An unexpected error occurred.')
    }
    throw error
  }
}
