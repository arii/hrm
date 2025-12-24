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
 * Creates a proxy for the Spotify SDK's player object that safely handles optional
 * device IDs. It intercepts calls to specified player methods and modifies
 * the arguments to ensure type compatibility with the underlying SDK, which may
 * not correctly type `device_id` as optional.
 *
 * @param sdk - The initialized Spotify API SDK instance.
 * @returns A proxied version of the SDK's player API with enhanced type safety.
 */
function createSafePlayerProxy(sdk: SpotifyApi): SpotifyApi['player'] {
  return new Proxy(sdk.player, {
    /**
     * Intercepts method calls on the player object.
     * @param target - The original player object.
     * @param prop - The name of the method being called.
     * @param args - The arguments passed to the method.
     * @returns The result of the SDK method call.
     */
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
        return function (this: any, ...args: any[]) {
          const [deviceId, ...restArgs] = args

          // If deviceId is null, undefined, or an empty string, call without it.
          if (!deviceId) {
            // This is a workaround for the SDK expecting a deviceId even when optional.
            // @ts-expect-error - We are intentionally calling with fewer arguments.
            return originalMethod.apply(this, restArgs)
          }

          // Otherwise, call with all original arguments.
          return originalMethod.apply(this, args)
        }
      }

      return Reflect.get(target, prop, receiver)
    },
  })
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
export function createSafeSpotifyApi(sdk: SpotifyApi): SpotifyApi {
  // Replace the player object with our safe proxy.
  sdk.player = createSafePlayerProxy(sdk)
  return sdk
}
