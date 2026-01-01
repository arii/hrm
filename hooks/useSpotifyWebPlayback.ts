'use client'

import { useCallback, useEffect, useState } from 'react'
import { useError } from '@/context/ErrorContext'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import { fetchWithRetry, AppError } from '@/utils/network'

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
        const response = await fetchWithRetry(API_SPOTIFY_ACCESS_TOKEN)
        const { accessToken } = await response.json()

        if (!accessToken) {
          throw new Error('Access token was not found in the response.')
        }

        setIsAuthenticated(true)
        cb(accessToken)
      } catch (error) {
        const appError = error as AppError
        // Don't show a persistent error for unauthenticated users
        if (appError.code === 'HTTP_ERROR_401') {
            '[Spotify Web Playback] User not logged in, Web Playback unavailable'
          )
        } else {
          addError(`Authentication failed: ${appError.message}`, 'persistent')
            `[Spotify Web Playback] getOAuthToken error: ${appError.message}`
          )
        }
        setIsAuthenticated(false)
      }
    },
    [addError]
  )

  // Effect to load the Spotify SDK script and initialize the player
  useEffect(() => {
      '[Spotify Web Playback] Hook initialized, checking prerequisites...'
    )

    // Prevent re-initialization if player already exists and is ready
    if (player && isReady) {
      return
    }

    // Check if user has active session before initializing
    fetchWithRetry(API_SPOTIFY_ACCESS_TOKEN)
      .then(() => {
        // User is logged in, proceed with initialization
        initializeSDK()
      })
      .catch(() => {
          '[Spotify Web Playback] No active session, skipping Web Playback initialization'
        )
      })

    function initializeSDK() {
      // Load the SDK script if not already loaded
      if (!window.Spotify) {
        const script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
      } else {
        // SDK already loaded, initialize immediately
        initializePlayer()
      }

      // This function is called by the Spotify SDK once it's loaded.
      window.onSpotifyWebPlaybackSDKReady = () => {
        initializePlayer()
      }
    }

    function initializePlayer() {
      // Don't initialize if we already have a player
      if (player) {
          '[Spotify Web Playback] Player already exists, skipping initialization'
        )
        return
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'HRM Web Player',
        getOAuthToken,
        volume: 0.5,
      })

      // --- Player Event Listeners ---

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        setIsReady(true)
        // No singular error state to clear, errors are managed in a list
        // addError functions manages individual errors with an id
      })

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
          '[Spotify Web Playback] Device ID has gone offline',
          device_id
        )
        setIsReady(false)
        setDeviceId(null)
      })

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        addError(`Initialization failed: ${message}`, 'persistent')
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        addError(`Authentication failed: ${message}`, 'persistent')
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        addError(
          `Account error: ${message}. A Premium account is required.`,
          'persistent'
        )
      })

      setPlayer(spotifyPlayer)

      // --- Connect the Player ---
      spotifyPlayer.connect().then((success) => {
        if (success) {
            '[Spotify Web Playback] The Web Playback SDK successfully connected to Spotify!'
          )
        } else {
          // Note: connect() can return false even when connection succeeds
          // We'll rely on the 'ready' event to confirm actual connection status
            '[Spotify Web Playback] connect() returned false, but this may be a false negative'
          )
        }
      })
    }

    // Cleanup function to disconnect the player when component unmounts
    return () => {
      if (player && typeof player.disconnect === 'function') {
        player.disconnect()
      }
    }
    // We intentionally include player and isReady to control re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOAuthToken])

  return { player, isReady, deviceId, isAuthenticated }
}

export default useSpotifyWebPlayback
