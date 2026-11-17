import {
  dedupeDevicesByName,
  spotifyDeviceLabel,
} from '@/components/SpotifyDeviceSelector'
import type { SpotifyDevice } from '@/types/core'

const device = (id: string, name: string, is_active = false) =>
  ({ id, name, is_active }) as SpotifyDevice

describe('dedupeDevicesByName', () => {
  it('lists each HRM Web Player once, keeping the active one', () => {
    const result = dedupeDevicesByName([
      device('a', 'HRM Web Player'),
      device('b', 'HRM Web Player', true),
      device('c', 'HRM Web Player'),
      device('d', 'Kitchen'),
    ])
    expect(result.map((d) => d.id)).toEqual(['b', 'd'])
  })

  it('keeps the newest entry when none is active', () => {
    const result = dedupeDevicesByName([
      device('a', 'HRM Web Player'),
      device('c', 'HRM Web Player'),
    ])
    expect(result.map((d) => d.id)).toEqual(['c'])
  })
})

describe('spotifyDeviceLabel', () => {
  it('shows the device name', () => {
    expect(spotifyDeviceLabel(device('a', 'HRM Web Player'))).toBe(
      'HRM Web Player'
    )
  })

  it('never shows a raw device id or an empty name', () => {
    const rawId = '0d228407f01d32d682e63af02f7c278b0c031075'
    expect(spotifyDeviceLabel(device(rawId, rawId))).toBe(
      'Unnamed Spotify device'
    )
    expect(spotifyDeviceLabel(device('a', '  '))).toBe('Unnamed Spotify device')
  })
})
