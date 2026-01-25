import { jest } from '@jest/globals'
import { resolveSpotifyDeviceId } from '../../../../lib/spotify/device'

describe('resolveSpotifyDeviceId', () => {
  it('should return the active device ID if available', () => {
    const devices = [
      { id: '1', is_active: false, name: 'Device 1' },
      { id: '2', is_active: true, name: 'Device 2' },
    ]
    const selectedDeviceId = '3'
    const result = resolveSpotifyDeviceId(devices, selectedDeviceId)
    expect(result).toBe('2')
  })

  it('should return the selected device ID if no active device is available', () => {
    const devices = [
      { id: '1', is_active: false, name: 'Device 1' },
      { id: '2', is_active: false, name: 'Device 2' },
    ]
    const selectedDeviceId = '3'
    const result = resolveSpotifyDeviceId(devices, selectedDeviceId)
    expect(result).toBe('3')
  })

  it('should return the first available device ID if no active or selected device is available', () => {
    const devices = [
      { id: '1', is_active: false, name: 'Device 1' },
      { id: '2', is_active: false, name: 'Device 2' },
    ]
    const selectedDeviceId = null
    const result = resolveSpotifyDeviceId(devices, selectedDeviceId)
    expect(result).toBe('1')
  })

  it('should return null if no devices are available', () => {
    const devices = []
    const selectedDeviceId = null
    const result = resolveSpotifyDeviceId(devices, selectedDeviceId)
    expect(result).toBeNull()
  })
})
