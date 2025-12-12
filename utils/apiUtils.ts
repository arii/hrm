// utils/apiUtils.ts

/**
 * Maps Spotify command keys to more user-friendly, descriptive messages.
 * This is used to provide better fallback error messages when the API
 * does not return a specific error message.
 */
const commandErrorMap: Record<string, string> = {
  PLAY: 'Failed to start or resume playback.',
  PAUSE: 'Failed to pause playback.',
  NEXT: 'Failed to skip to the next track.',
  PREVIOUS: 'Failed to skip to the previous track.',
  SET_VOLUME: 'Failed to set the volume.',
  TRANSFER_PLAYBACK: 'Failed to transfer playback to another device.',
  GET_DEVICES: 'Failed to get the list of available devices.',
}

/**
 * Handles the response from a Spotify API call made via fetch.
 * It checks for non-ok responses and throws a formatted, user-friendly error.
 *
 * @param {Response} response - The response object from the fetch call.
 * @param {string} command - The Spotify command that was executed (e.g., 'PLAY', 'PAUSE').
 * @throws {Error} Throws an error with a user-friendly message if the response is not ok.
 */
export const handleSpotifyApiResponse = async (
  response: Response,
  command: string
): Promise<void> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const defaultMessage =
      commandErrorMap[command] || `Spotify command '${command}' failed.`
    throw new Error(errorData.message || defaultMessage)
  }
}
