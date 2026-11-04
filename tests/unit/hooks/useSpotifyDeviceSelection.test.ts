import { resolveSelectedDeviceSync } from '@/hooks/useSpotifyDeviceSelection'
import type { SpotifyDevice } from '@/types/core'

describe('resolveSelectedDeviceSync', () => {
  const device = (id: string, isActive: boolean): SpotifyDevice =>
    ({ id, is_active: isActive }) as unknown as SpotifyDevice

  it.each([
    [
      'clears the selection when the list empties',
      [],
      'old-id',
      { kind: 'select', deviceId: '' },
    ],
    [
      'stays empty when the list is empty and nothing selected',
      [],
      '',
      { kind: 'none' },
    ],
    [
      'auto-selects the active device',
      [device('d1', false), device('d2', true)],
      '',
      { kind: 'select', deviceId: 'd2' },
    ],
    [
      'leaves an empty selection when nothing is active',
      [device('d1', false)],
      '',
      { kind: 'none' },
    ],
    [
      'keeps a selected device that is still listed',
      [device('d1', false)],
      'd1',
      { kind: 'none' },
    ],
    [
      're-resolves to the active device when the selection vanishes',
      [device('d2', true)],
      'gone-id',
      { kind: 'select', deviceId: 'd2' },
    ],
    [
      'clears when the selection vanishes with nothing active',
      [device('d2', false)],
      'gone-id',
      { kind: 'select', deviceId: '' },
    ],
    [
      'treats a missing list as empty',
      null,
      'old-id',
      { kind: 'select', deviceId: '' },
    ],
  ])('%s', (_name, devices, selectedDeviceId, expected) => {
    expect(resolveSelectedDeviceSync(devices, selectedDeviceId)).toEqual(
      expected
    )
  })
})
