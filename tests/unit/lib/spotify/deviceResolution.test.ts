/**
 * @jest-environment node
 */
import {
  findActiveDevice,
  resolveTargetDeviceId,
} from '@/lib/spotify/deviceResolution'
import type { SpotifyDevice } from '@/types/core'

const device = (overrides: Partial<SpotifyDevice>): SpotifyDevice => ({
  id: 'd1',
  is_active: false,
  is_private_session: false,
  is_restricted: false,
  name: 'Speaker',
  type: 'Speaker',
  volume_percent: 50,
  ...overrides,
})

describe('spotify deviceResolution', () => {
  describe('findActiveDevice', () => {
    it('returns the active device', () => {
      const devices = [
        device({ id: 'a' }),
        device({ id: 'b', is_active: true }),
      ]
      expect(findActiveDevice(devices)?.id).toBe('b')
    })

    it('returns null when none active or list missing', () => {
      expect(findActiveDevice([device({ id: 'a' })])).toBeNull()
      expect(findActiveDevice(undefined)).toBeNull()
      expect(findActiveDevice(null)).toBeNull()
    })
  })

  describe('resolveTargetDeviceId', () => {
    const devices = [device({ id: 'a' }), device({ id: 'b', is_active: true })]

    it('prefers the explicit selection', () => {
      expect(resolveTargetDeviceId('sel', devices, 'hrm')).toBe('sel')
    })

    it('passes explicit ids through even when absent from the snapshot', () => {
      // The device list is a 10s-stale snapshot: an unknown id may be a
      // live SDK session the poll hasn't seen. Substituting another
      // device would be worse than an honest API failure.
      expect(resolveTargetDeviceId('fresh-session', devices, 'hrm')).toBe(
        'fresh-session'
      )
    })

    it('falls back to the active device', () => {
      expect(resolveTargetDeviceId(undefined, devices, 'hrm')).toBe('b')
      expect(resolveTargetDeviceId('', devices, 'hrm')).toBe('b')
    })

    it('falls back to the HRM player', () => {
      expect(
        resolveTargetDeviceId(undefined, [device({ id: 'a' })], 'hrm')
      ).toBe('hrm')
    })

    it('returns undefined when nothing resolves', () => {
      expect(
        resolveTargetDeviceId(undefined, [device({ id: 'a' })])
      ).toBeUndefined()
      expect(resolveTargetDeviceId(undefined, undefined)).toBeUndefined()
    })
  })
})
