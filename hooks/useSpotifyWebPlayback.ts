'use client'

import { useCallback, useEffect, useState } from 'react'
import { useError } from '@/context/ErrorContext'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import { fetchWithRetry, AppError } from '@/utils/network'
import { signOut } from 'next-auth/react'
import { useSpotifyAuth } from './useSpotifyAuth'

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
  /**
   * Manages the Spotify player initialization lifecycle to prevent thrashing.
   * - `idle`: The default state, waiting for conditions to be met.
   * - `initializing`: The SDK is loading or the player is being created.
   * - `ready`: The player has successfully initialized and is ready to be used.
   * - `failed`: A non-recoverable error occurred during initialization.
   */
  const [initStatus, setInitStatus] = useState<
    'idle' | 'initializing' | 'ready' | 'failed'
  >('idle')
  const { addError } = useError()
  const { status } = useSpotifyAuth()

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
        cb(accessToken)
      } catch (error) {
        const appError = error as AppError
        console.error(
          `[Spotify Web Playback] Failed to get OAuth token: ${appError.message}`
        )

        // If the error is a 401 Unauthorized, it likely means the session is
        // invalid or expired. The Spotify SDK will cache this failing token
        // and stop asking for a new one. To force a re-auth flow, we must
        // sign the user out, which will clear the session and prompt a new login.
        if (appError.code === 'HTTP_ERROR_401') {
          setInitStatus('failed') // <-- Circuit breaker
          console.warn(
            '[Spotify Web Playback] Received 401, signing out to force re-authentication.'
          )
          addError('Spotify session expired. Please log in again.', {
            persist: true,
          })
          // Note: This is a redundant sign-out trigger. The `useSpotifyAuth`
          // hook also handles the `RefreshAccessTokenError` and initiates a
          // sign-out. While this is a safeguard, a future refactor could
          // streamline this to rely on a single source of truth for session
          // validity.
          await signOut()
        } else {
          setInitStatus('failed')
          // For other errors, show a non-persistent error message to the user.
          addError(`Failed to authenticate with Spotify: ${appError.message}`, {
            persist: false,
          })
        }
        // The SDK might retry on its own for certain errors.
      }
    },
    [addError, setInitStatus]
  )

  // Effect to load the Spotify SDK script and initialize the player
  useEffect(() => {
    // This is the "circuit breaker". It ensures that we only try to initialize
    // the Spotify player if the user is authenticated and we haven't already
    // started the process.
    if (status !== 'authenticated' || initStatus !== 'idle') {
      return
    }

    // Mark as initializing to prevent this effect from running again.
    setInitStatus('initializing')

    const initializeSDK = () => {
      if (!window.Spotify) {
        console.log('[Spotify Web Playback] Loading Spotify SDK script...')
        const script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
        // The SDK will call the global onSpotifyWebPlaybackSDKReady function
        // once it's loaded.
      } else {
        console.log('[Spotify Web Playback] Spotify SDK already loaded')
        initializePlayer()
      }
    }

    const initializePlayer = () => {
      // Don't re-initialize if a player instance already exists
      if (player) {
        return
      }

      console.log('[Spotify Web Playback] Initializing new player instance...')
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
        setInitStatus('ready')
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
        setInitStatus('failed')
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('[Spotify Web Playback] Authentication Error:', message)
        addError(`Authentication failed: ${message}`, { persist: true })
        setInitStatus('failed')
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('[Spotify Web Playback] Account Error:', message)
        addError(`Account error: ${message}. A Premium account is required.`, {
          persist: true,
        })
        setInitStatus('failed')
      })

      setPlayer(spotifyPlayer)

      spotifyPlayer.connect().then((success) => {
        if (success) {
          console.log(
            '[Spotify Web Playback] The Web Playback SDK successfully connected to Spotify!'
          )
        } else {
          console.warn(
            '[Spotify Web Playback] connect() returned false, but this is often a false negative.'
          )
        }
      })
    }

    // The SDK script will call this global function once loaded.
    window.onSpotifyWebPlaybackSDKReady = initializePlayer

    initializeSDK()

    // Cleanup function
    return () => {
      if (player) {
        console.log('[Spotify Web Playback] Disconnecting player on cleanup')
        player.disconnect()
        setPlayer(null)
      }
      // It's important to clean up the global callback as well.
      window.onSpotifyWebPlaybackSDKReady = () => {}
    }
  }, [status, initStatus, getOAuthToken, addError, player])

  return { player, isReady, deviceId }
}

export default useSpotifyWebPlayback
