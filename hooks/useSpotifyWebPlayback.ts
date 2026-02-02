'use client'

import { useCallback, useEffect, useState } from 'react'
import { useError } from '@/context/ErrorContext'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import {
  SPOTIFY_AUTH_LOOP_GUARD_KEY,
  SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT,
} from '@/constants/spotify'
import { fetchWithRetry, AppError } from '@/utils/network'
import { signOut } from 'next-auth/react'
import { redirectTo } from '@/utils/redirect'

interface SpotifyDeviceEvent {
  device_id: string
}

interface SpotifyErrorEvent {
  message: string
}

// Define a minimal interface for the Spotify Player
// This will be expanded as we integrate more features.
interface SpotifyPlayer {
  connect: () => Promise<boolean>
  disconnect: () => void
  setVolume: (volume: number) => Promise<void>
  addListener(
    event: 'ready' | 'not_ready',
    callback: (data: SpotifyDeviceEvent) => void
  ): void
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error',
    callback: (data: SpotifyErrorEvent) => void
  ): void
  removeListener: (event: string) => void
  _options: {
    id: string
    name: string
  }
}

interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (cb: (token: string) => void) => void
  volume: number
}

// Define the structure for the window object to include the Spotify SDK properties
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

// Manages the Spotify Web Playback SDK lifecycle.
const useSpotifyWebPlayback = () => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const { addError } = useError()

  /**
   * Fetches the Spotify OAuth token from our secure backend API.
   * This function is passed to the Spotify Player constructor.
   */
  const getOAuthToken = useCallback(
    async (cb: (token: string) => void) => {
      try {
        const response = await fetchWithRetry(API_SPOTIFY_ACCESS_TOKEN)

        if (!response.ok) {
          if (response.status === 401) {
            // Circuit Breaker: Use sessionStorage to detect rapid failures
            const lastAuthFail = sessionStorage.getItem(
              SPOTIFY_AUTH_LOOP_GUARD_KEY
            )
            const now = Date.now()

            if (
              lastAuthFail &&
              now - parseInt(lastAuthFail) < SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT
            ) {
              console.error(
                `[Spotify] Auth loop detected (${
                  SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT / 1000
                }s threshold); aborting sign-out to prevent thrashing.`
              )
              return // Stop the loop here, preventing further action.
            }

            sessionStorage.setItem(SPOTIFY_AUTH_LOOP_GUARD_KEY, now.toString())
            addError('Spotify session expired. Please log in again.', {
              persist: true,
            })

            // redirect: false prevents the page from automatically reloading/redirecting
            await signOut({ redirect: false })
            redirectTo('/?error=SpotifyAuthFailed') // Manual redirect to a safe landing
            return // Explicitly return to stop processing
          }
          // For other non-ok responses, throw to be caught by the catch block.
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const { accessToken } = await response.json()
        if (!accessToken) {
          throw new Error('Access token was not found in the response.')
        }
        cb(accessToken)
      } catch (error) {
        const appError = error as AppError
        console.error(
          `[Spotify Web Playback] Failed to get OAuth token: ${appError.message}`
        )
        addError(`Failed to authenticate with Spotify: ${appError.message}`, {
          persist: false,
        })
      }
    },
    [addError]
  )

  // Effect to load the Spotify SDK script and initialize the player
  useEffect(() => {
    console.log(
      '[Spotify Web Playback] Hook initialized, checking prerequisites...'
    )

    // Prevent re-initialization if player already exists and is ready
    if (player && isReady) {
      console.log('[Spotify Web Playbook] Player already initialized and ready')
      return
    }

    initializeSDK()

    function initializeSDK() {
      // Load the SDK script if not already loaded
      if (!window.Spotify) {
        console.log('[Spotify Web Playback] Loading Spotify SDK script...')
        const script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
      } else {
        console.log('[Spotify Web Playback] Spotify SDK already loaded')
        // SDK already loaded, initialize immediately
        initializePlayer()
      }

      // This function is called by the Spotify SDK once it's loaded.
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('[Spotify Web Playback] SDK ready callback triggered')
        initializePlayer()
      }
    }

    function initializePlayer() {
      // Don't initialize if we already have a player
      if (player) {
        console.log(
          '[Spotify Web Playback] Player already exists, skipping initialization'
        )
        return
      }

      console.log('[Spotify Web Playback] Initializing player...')
      const spotifyPlayer = new window.Spotify.Player({
        name: 'HRM Web Player',
        getOAuthToken,
        volume: 0.5,
      })

      // --- Player Event Listeners ---

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('[Spotify Web Playback] Ready with Device ID', device_id)
        setDeviceId(device_id)
        setIsReady(true)
        // No singular error state to clear, errors are managed in a list
        // addError functions manages individual errors with an id
      })

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log(
          '[Spotify Web Playback] Device ID has gone offline',
          device_id
        )
        setIsReady(false)
        setDeviceId(null)
      })

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('[Spotify Web Playback] Initialization Error:', message)
        addError(`Initialization failed: ${message}`, { persist: true })
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('[Spotify Web Playback] Authentication Error:', message)
        addError(`Authentication failed: ${message}`, { persist: true })
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('[Spotify Web Playback] Account Error:', message)
        addError(`Account error: ${message}. A Premium account is required.`, {
          persist: true,
        })
      })

      setPlayer(spotifyPlayer)

      // --- Connect the Player ---
      spotifyPlayer.connect().then((success) => {
        if (success) {
          console.log(
            '[Spotify Web Playback] The Web Playback SDK successfully connected to Spotify!'
          )
        } else {
          // Note: connect() can return false even when connection succeeds
          // We'll rely on the 'ready' event to confirm actual connection status
          console.warn(
            '[Spotify Web Playback] connect() returned false, but this may be a false negative'
          )
        }
      })
    }

    // Cleanup function to disconnect the player when component unmounts
    return () => {
      if (player && typeof player.disconnect === 'function') {
        console.log('[Spotify Web Playback] Disconnecting player on cleanup')
        player.disconnect()
      }
    }
    // We intentionally include player and isReady to control re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOAuthToken])

  return { player, isReady, deviceId }
}

export default useSpotifyWebPlayback
