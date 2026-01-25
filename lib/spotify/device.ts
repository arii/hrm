interface SpotifyDevice {
  id: string
  name: string
  is_active?: boolean
}

export const resolveSpotifyDeviceId = (
  devices: SpotifyDevice[],
  selectedDeviceId: string | null
): string | null => {
  if (devices.length === 0) {
    return null
  }

  const activeDevice = devices.find((d) => d.is_active)
  if (activeDevice) {
    return activeDevice.id
  }

  if (selectedDeviceId) {
    return selectedDeviceId
  }

  return devices[0].id
}
