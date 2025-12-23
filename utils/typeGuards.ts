/**
 * Checks if a given value is a valid Spotify device ID.
 * A valid device ID is a non-empty string.
 *
 * @param id The value to check.
 * @returns True if the value is a valid device ID, false otherwise.
 */
export function isValidDeviceId(id: any): id is string {
  return typeof id === 'string' && id.length > 0
}
