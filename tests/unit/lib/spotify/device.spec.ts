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

  it('should return the first device ID if no device is active and no preferred types are provided', () => {
    expect(resolveSpotifyDeviceId(mockDevices)).toBe('MOCK_DEVICE_ID_1')
  })

  it('should return the active device ID if one is active', () => {
    const devices = JSON.parse(JSON.stringify(mockDevices))
    devices[1].is_active = true
    expect(resolveSpotifyDeviceId(devices)).toBe('MOCK_DEVICE_ID_2')
  })

  it('should return the active device ID even if preferred types are provided', () => {
    const devices = JSON.parse(JSON.stringify(mockDevices))
    devices[2].is_active = true
    expect(resolveSpotifyDeviceId(devices, ['MOCK_DEVICE_TYPE_1'])).toBe(
      'MOCK_DEVICE_ID_3',
    )
  })

  it('should return the first preferred device type if no device is active', () => {
    const preferredTypes = ['MOCK_DEVICE_TYPE_2', 'MOCK_DEVICE_TYPE_3']
    expect(resolveSpotifyDeviceId(mockDevices, preferredTypes)).toBe(
      'MOCK_DEVICE_ID_2',
    )
  })

  it('should return the second preferred device type if the first is not available', () => {
    const preferredTypes = ['NonExistentType', 'MOCK_DEVICE_TYPE_3']
    expect(resolveSpotifyDeviceId(mockDevices, preferredTypes)).toBe(
      'MOCK_DEVICE_ID_3',
    )
  })

  it('should return the first device if no preferred types match and no device is active', () => {
    const preferredTypes = ['NonExistentType1', 'NonExistentType2']
    expect(resolveSpotifyDeviceId(mockDevices, preferredTypes)).toBe(
      'MOCK_DEVICE_ID_1',
    )
  })
})
