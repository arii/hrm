import { dedupeDevicesByName } from '@/components/SpotifyDeviceSelector'
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
