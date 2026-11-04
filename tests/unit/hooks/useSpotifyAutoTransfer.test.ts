import {
  shouldAutoTransfer,
  type AutoTransferEligibility,
} from '@/hooks/useSpotifyAutoTransfer'
import type { SpotifyDevice } from '@/types/core'

describe('shouldAutoTransfer', () => {
  const idleDevice = { is_active: false } as unknown as SpotifyDevice
  const activeDevice = { is_active: true } as unknown as SpotifyDevice

  const baseState = (): AutoTransferEligibility => ({
    isReady: true,
    deviceId: 'browser-player-id',
    connectionStatus: 'Connected',
    devices: [idleDevice],
    cooldownActive: false,
    stableActive: false,
    isPlaying: false,
  })

  it.each([
    ['eligible when ready, listed, idle, and cool', {}, true],
    ['not ready', { isReady: false }, false],
    ['no device id', { deviceId: null }, false],
    ['disconnected', { connectionStatus: 'Connecting...' }, false],
    ['cooldown active', { cooldownActive: true }, false],
    ['no devices yet (waits for the poll)', { devices: [] }, false],
    ['devices unknown', { devices: null }, false],
    [
      'another device active (never steals)',
      { devices: [activeDevice] },
      false,
    ],
    ['latched active across flaps', { stableActive: true }, false],
    ['audible playback (never steals)', { isPlaying: true }, false],
  ])('%s', (_name, overrides, expected) => {
    expect(shouldAutoTransfer({ ...baseState(), ...overrides })).toBe(expected)
  })
})
