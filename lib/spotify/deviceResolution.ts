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
 */
export const resolveTargetDeviceId = (
  selectedId: string | null | undefined,
  devices: SpotifyDevice[] | null | undefined,
  hrmPlayerId?: string | null
): string | undefined =>
  selectedId || findActiveDevice(devices)?.id || hrmPlayerId || undefined
