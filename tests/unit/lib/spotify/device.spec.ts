/**
 * @jest-environment jsdom
 */
import { resolveSpotifyDeviceId } from '@/lib/spotify/device'
import type { SpotifyDevice } from '@/types/core'

const mockDevices: SpotifyDevice[] = [
  {
    id: 'MOCK_DEVICE_ID_1',
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    name: 'MOCK_DEVICE_NAME_1',
    type: 'MOCK_DEVICE_TYPE_1',
    volume_percent: 100,
    supports_volume: true,
  },
  {
    id: 'MOCK_DEVICE_ID_2',
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    name: 'MOCK_DEVICE_NAME_2',
    type: 'MOCK_DEVICE_TYPE_2',
    volume_percent: 100,
    supports_volume: true,
  },
  {
    id: 'MOCK_DEVICE_ID_3',
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    name: 'MOCK_DEVICE_NAME_3',
    type: 'MOCK_DEVICE_TYPE_3',
    volume_percent: 100,
    supports_volume: true,
  },
]

describe('resolveSpotifyDeviceId', () => {
  it('should return an empty string if the device list is empty', () => {
    expect(resolveSpotifyDeviceId([])).toBe('')
  })

  it('should return the first device ID if no device is active', () => {
    expect(resolveSpotifyDeviceId(mockDevices)).toBe('MOCK_DEVICE_ID_1')
  })

  it('should return the active device ID if one is active', () => {
    const devices = [...mockDevices]
    devices[1].is_active = true
    expect(resolveSpotifyDeviceId(devices)).toBe('MOCK_DEVICE_ID_2')
  })

  it('should return the active device ID if multiple devices are present but only one is active', () => {
    const devices = [...mockDevices]
    devices[2].is_active = true
    expect(resolveSpotifyDeviceId(devices)).toBe('MOCK_DEVICE_ID_3')
  })
})
