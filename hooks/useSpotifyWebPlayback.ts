'use client'

import { useCallback, useEffect, useState } from 'react'

import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import { useError } from '@/context/ErrorContext'

// Define event data types for better type safety
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

/**
 * A custom hook to manage the Spotify Web Playback SDK.
 *
 * This hook handles:
 * - Dynamically loading the Spotify Player SDK script.
 * - Initializing the player when user is authenticated.
 * - Fetching the OAuth token securely from our backend.
 * - Managing player state (ready, device ID, errors).
 * - Exposing the player instance and its state to components.
 */
const useSpotifyWebPlayback = () => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const { addError } = useError()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  /**
   * Fetches the Spotify OAuth token from our secure backend API.
   * This function is passed to the Spotify Player constructor.
   */
  const getOAuthToken = useCallback(
    async (cb: (token: string) => void) => {
      try {
        const response = await fetch(API_SPOTIFY_ACCESS_TOKEN)
        if (!response.ok) {
          if (response.status === 401) {
            // User not logged in - this is expected, don't show as error
            console.log(
              '[Spotify Web Playback] User not logged in, Web Playback unavailable'
            )
            setIsAuthenticated(false)
            return
          }
          const errorText = await response.text()
          throw new Error(
            `Failed to fetch Spotify access token: ${response.status} ${errorText}`
          )
        }
        const { accessToken } = await response.json()
        if (!accessToken) {
          throw new Error('Access token was not found in the response.')
        }
        console.log(
          '[Spotify Web Playback] Access token retrieved successfully'
        )
        setIsAuthenticated(true)
        cb(accessToken)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unknown error occurred.'
        addError(`Authentication failed: ${message}`, 'persistent')
        setIsAuthenticated(false)
        console.warn(`[Spotify Web Playback] getOAuthToken error: ${message}`)
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

    // Check if user has active session before initializing
    fetch(API_SPOTIFY_ACCESS_TOKEN)
      .then((response) => {
        if (!response.ok) {
          console.log(
            '[Spotify Web Playback] No active session, skipping Web Playback initialization'
          )
          return
        }
        // User is logged in, proceed with initialization
        initializeSDK()
      })
      .catch(() => {
        console.log(
          '[Spotify Web Playback] Session check failed, skipping Web Playback initialization'
        )
      })

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
        addError(`Initialization failed: ${message}`, 'persistent')
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('[Spotify Web Playback] Authentication Error:', message)
        addError(`Authentication failed: ${message}`, 'persistent')
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('[Spotify Web Playback] Account Error:', message)
        addError(`Account error: ${message}. A Premium account is required.`, 'persistent')
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

  return { player, isReady, deviceId, isAuthenticated }
}

export default useSpotifyWebPlayback
