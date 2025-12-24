/**
 * @fileoverview This module provides a type-safe wrapper around the Spotify Web API SDK.
 * It ensures that methods are called with the correct parameters, particularly for
 * device_id, which can be optional but is not always typed as such in the SDK.
 * This avoids the need for unsafe type assertions in the application code.
 *
 * @see {@link https://github.com/spotify/web-api-ts-sdk/issues/106} - GitHub issue
 * regarding the missing `undefined` type for `device_id`.
 */

import { SpotifyApi } from '@spotify/web-api-ts-sdk'

/**
 * A type representing the SpotifyApi but with a modified player object that
 * correctly types `deviceId` as optional for certain methods. This ensures
 * that all original player methods are preserved.
 */
export type SafeSpotifyApi = Omit<SpotifyApi, 'player'> & {
  player: SpotifyApi['player'] & {
    startResumePlayback: (
      deviceId?: string,
      context_uri?: string,
      uris?: string[],
      offset?: object,
      position_ms?: number
    ) => Promise<void>
    pausePlayback: (deviceId?: string) => Promise<void>
    skipToNext: (deviceId?: string) => Promise<void>
    skipToPrevious: (deviceId?: string) => Promise<void>
  }
}

/**
 * Creates a proxy for the Spotify SDK's player object that safely handles optional
 * device IDs. It intercepts calls to specified player methods and modifies
 * the arguments to ensure type compatibility with the underlying SDK, which may
 * not correctly type `device_id` as optional.
 *
 * @param sdk - The initialized Spotify API SDK instance.
 * @returns A proxied version of the SDK's player API with enhanced type safety.
 */
function createSafePlayerProxy(
  player: SpotifyApi['player']
): SafeSpotifyApi['player'] {
  return new Proxy(player, {
    get(target, prop, receiver) {
      const originalMethod = target[prop as keyof typeof target]

      if (
        typeof originalMethod === 'function' &&
        [
          'startResumePlayback',
          'pausePlayback',
          'skipToNext',
          'skipToPrevious',
        ].includes(prop as string)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function (...args: any[]) {
          const [deviceId, ...restArgs] = args

          if (!deviceId) {
            return (originalMethod as (...args: unknown[]) => unknown).apply(
              target,
              restArgs
            )
          }
          return (originalMethod as (...args: unknown[]) => unknown).apply(
            target,
            args
          )
        }
      }

      return Reflect.get(target, prop, receiver)
    },
  }) as SafeSpotifyApi['player']
}

/**
 * Wraps the SpotifyApi instance to provide a safer interface for player controls.
 * This function replaces the original `sdk.player` with a proxy that correctly
 * handles optional `deviceId` parameters, preventing runtime errors and eliminating
 * the need for unsafe type assertions.
 *
 * @param sdk - The original SpotifyApi instance.
 * @returns The SpotifyApi instance with a proxied, type-safe player object.
 */
export function createSafeSpotifyApi(sdk: SpotifyApi): SafeSpotifyApi {
  // Replace the player object with our safe proxy.
  sdk.player = createSafePlayerProxy(sdk.player)
  return sdk as SafeSpotifyApi
}
