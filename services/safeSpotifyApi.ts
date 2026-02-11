/**
 * @fileoverview This module provides a type-safe wrapper around the Spotify Web API SDK.
 * It ensures that methods with optional device_id parameters are correctly typed.
 *
 * @see {@link https://github.com/spotify/web-api-ts-sdk/issues/106} - GitHub issue
 * regarding the missing `undefined` type for `device_id`.
 */

import { SpotifyApi } from '@spotify/web-api-ts-sdk'

/**
 * A type representing the SpotifyApi with corrected typing for player methods
 * that accept optional deviceId parameters.
 */
export type SafeSpotifyApi = Omit<SpotifyApi, 'player'> & {
  player: SpotifyApi['player'] & {
    startResumePlayback: (
      deviceId?: string | null,
      context_uri?: string,
      uris?: string[],
      offset?: object,
      position_ms?: number
    ) => Promise<void>
    pausePlayback: (deviceId?: string | null) => Promise<void>
    skipToNext: (deviceId?: string | null) => Promise<void>
    skipToPrevious: (deviceId?: string | null) => Promise<void>
  }
}

/**
 * Type-casts the SpotifyApi instance to provide correct optional parameter typing.
 * The underlying SDK correctly handles optional deviceId parameters at runtime;
 * this function only provides type safety without runtime overhead.
 *
 * @param sdk - The original SpotifyApi instance.
 * @returns The same SDK instance with corrected types.
 */
export function createSafeSpotifyApi(sdk: SpotifyApi): SafeSpotifyApi {
  return sdk as SafeSpotifyApi
}
