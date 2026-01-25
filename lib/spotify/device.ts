import type { SpotifyDevice } from '@/types/core'

/**
 * Resolves the target device ID from a list of devices.
 * Returns the active device, or the first device if none are active.
 */
export function resolveSpotifyDeviceId(devices: SpotifyDevice[]): string {
  const activeDevice = devices.find((d) => d.is_active)
  return activeDevice?.id || devices[0]?.id || ''
}
