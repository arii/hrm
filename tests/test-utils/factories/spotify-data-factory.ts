import { SpotifyDevice } from '@/types/core'
import { SpotifyData } from '@/types/websocket'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'

/**
 * Creates a mock SpotifyDevice object for use in tests.
 * @param overrides - Partial<SpotifyDevice> to override default values.
 * @returns A mock SpotifyDevice.
 */
export const createMockSpotifyDevice = (
  overrides: Partial<SpotifyDevice> = {}
): SpotifyDevice => ({
  id: 'mock-device-id',
  is_active: false,
  is_private_session: false,
  is_restricted: false,
  name: 'Mock Device',
  type: 'Computer',
  volume_percent: 50,
  ...overrides,
})

/**
 * Creates a mock SpotifyData object for use in tests.
 * @param overrides - Partial<SpotifyData> to override default values.
 * @returns A mock SpotifyData.
 */
export const createMockSpotifyData = (
  overrides: Partial<SpotifyData> = {}
): SpotifyData => ({
  trackId: 'mock-track-id',
  trackName: 'Mock Track',
  artist: 'Mock Artist',
  albumName: 'Mock Album',
  albumArtUrl: 'http://localhost/mock-art.jpg',
  isPlaying: true,
  devices: [
    createMockSpotifyDevice({ id: '1', name: 'Device 1', is_active: true }),
    createMockSpotifyDevice({
      id: 'hrm-player',
      name: HRM_WEB_PLAYER_NAME,
      is_active: false,
    }),
  ],
  volume: 50,
  isMuted: false,
  ...overrides,
})
