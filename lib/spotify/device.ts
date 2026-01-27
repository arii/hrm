import type { SpotifyDevice } from '@/types/spotify'

/**
 * Resolves the target device ID from a list of available devices.
 *
 * The logic prioritizes devices in the following order:
 * 1. The currently active device.
 * 2. The first available "Computer".
 * 3. The first available "Speaker".
 * 4. The first device in the list as a fallback.
 *
 * @param {SpotifyDevice[]} devices - An array of available Spotify devices.
 * @returns {string} The ID of the resolved device, or an empty string if no devices are available.
 */
export function resolveSpotifyDeviceId(devices: SpotifyDevice[]): string {
  if (!devices || devices.length === 0) {
    return ''
  }

  // 1. Prioritize the active device
  const activeDevice = devices.find((d) => d.is_active)
  if (activeDevice) {
    return activeDevice.id
  }

  // 2. Prioritize specific device types
  const computer = devices.find((d) => d.type === 'Computer')
  if (computer) {
    return computer.id
  }

  const speaker = devices.find((d) => d.type === 'Speaker')
  if (speaker) {
    return speaker.id
  }

  // 3. Fallback to the first device in the list
  return devices[0]!.id
}
