import type { SpotifyDevice } from '@/types/core'

/**
 * Resolves the target device ID from a list of devices.
 * Returns the active device, or the first device if none are active.
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

  // 2. Prioritize preferred device types
  for (const preferredType of preferredDeviceTypes) {
    const preferredDevice = devices.find((d) => d.type === preferredType)
    if (preferredDevice) {
      return preferredDevice.id
    }
  }

  // 3. Fallback to the first available device
  return devices[0]?.id || ''
}
