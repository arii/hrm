import type { SpotifyDevice } from '@/types/core'

/** The Spotify-reported active device, if any. */
export const findActiveDevice = (
  devices: SpotifyDevice[] | null | undefined
): SpotifyDevice | null => devices?.find((d) => d.is_active) ?? null

/**
 * Resolves which device a Spotify command should target.
 * Priority: explicit selection > Spotify-active device > HRM web player.
 * The HRM fallback is optional: volume commands omit it (their slider is
 * already disabled without an active device).
 * Explicit ids pass through even when absent from the (10s-stale) device
 * snapshot: a missing id may be a live SDK session the poll hasn't seen
 * yet, and substituting a different device would be worse than an honest
 * API failure. UI-state staleness is handled where the selection lives
 * (useSpotifyControlDevice clears dead ids on every update).
 */
export const resolveTargetDeviceId = (
  selectedId: string | null | undefined,
  devices: SpotifyDevice[] | null | undefined,
  hrmPlayerId?: string | null
): string | undefined =>
  selectedId || findActiveDevice(devices)?.id || hrmPlayerId || undefined
