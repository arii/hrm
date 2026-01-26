// lib/spotify/device.ts
interface SpotifyDevice {
  id: string
  name: string
  is_active?: boolean
}

/**
 * Resolves the Spotify device ID based on a priority list.
 * 1. Active device
 * 2. Currently selected device in UI
 * 3. First available device
 * @param devices - Array of available Spotify devices.
 * @param selectedDeviceId - The ID of the device currently selected in the UI.
 * @returns The resolved device ID or an empty string if none found.
 */
export const resolveSpotifyDeviceId = (
  devices: SpotifyDevice[] | undefined,
  selectedDeviceId: string
): string => {
  if (!devices || devices.length === 0) {
    return ''
  }

  const activeDevice = devices.find((d) => d.is_active)
  if (activeDevice) {
    return activeDevice.id
  }

  if (selectedDeviceId) {
    return selectedDeviceId
  }

  return devices[0]?.id || ''
}
