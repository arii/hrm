import type { SpotifyDevice } from '@/types/core'

/**
 * Resolves the target device ID from a list of available devices.
 *
 * The selection logic prioritizes devices in the following order:
 * 1. The currently active device.
 * 2. The first device matching a type from the `preferredDeviceTypes` list (case-insensitive).
 * 3. The first device in the overall list as a fallback.
 *
 * @param devices - An array of available Spotify devices.
 * @param preferredDeviceTypes - An optional array of device type strings to prioritize, e.g., ['Computer', 'Speaker'].
 * @returns The ID of the resolved Spotify device, or an empty string if no device is found.
 */
export function resolveSpotifyDeviceId(
  devices: SpotifyDevice[],
  preferredDeviceTypes: string[] = []
): string {
  if (!devices || devices.length === 0) {
    return ''
  }

  // 1. Prioritize the active device
  const activeDevice = devices.find((d) => d.is_active)
  if (activeDevice) {
    return activeDevice.id
  }

  // 2. Prioritize preferred device types (case-insensitive)
  for (const preferredType of preferredDeviceTypes) {
    const preferredDevice = devices.find(
      (d) => d.type.toLowerCase() === preferredType.toLowerCase()
    )
    if (preferredDevice) {
      return preferredDevice.id
    }
  }

  // 3. Fallback to the first available device
  return devices[0]?.id || ''
}
