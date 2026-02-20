'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useError } from '@/context/ErrorContext'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import {
  SPOTIFY_AUTH_LOOP_GUARD_KEY,
  SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT,
} from '@/constants/spotify'
import { fetchWithRetry, AppError } from '@/utils/network'
import { signOut } from 'next-auth/react'
import { redirectTo } from '@/utils/redirect'
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

// Define a module-level variable to track script loading status
let isScriptLoading = false

// Manages the Spotify Web Playback SDK lifecycle.
const useSpotifyWebPlayback = () => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [, setInitStatus] = useState<
    'idle' | 'initializing' | 'ready' | 'failed'
  >('idle')
  const { addError } = useError()
  const { status } = useSpotifyAuth()
  const isInitializing = useRef(false)

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
              setInitStatus('failed')
              return
            }

            sessionStorage.setItem(SPOTIFY_AUTH_LOOP_GUARD_KEY, now.toString())
            addError('Spotify session expired. Please log in again.', {
              persist: true,
            })

            setInitStatus('failed')
            await signOut({ redirect: false })
            redirectTo('/?error=SpotifyAuthFailed')
            return
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
        setInitStatus('failed')
        addError(`Failed to authenticate with Spotify: ${appError.message}`, {
          persist: false,
        })
      }
    },
    [addError]
  )

  useEffect(() => {
    if (status !== 'authenticated' || player || isInitializing.current) {
      return
    }

    const initializePlayer = () => {
      if (player || isInitializing.current) {
        return
      }

      console.log('[Spotify Web Playback] Initializing new player instance...')
      isInitializing.current = true
      setInitStatus('initializing')

      const spotifyPlayer = new window.Spotify.Player({
        name: 'HRM Web Player',
        getOAuthToken,
        volume: 0.5,
      })

      // --- Player Event Listeners ---

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('[Spotify Web Playback] Ready with Device ID', device_id)
        isInitializing.current = false
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
        isInitializing.current = false
        addError(`Initialization failed: ${message}`, { persist: true })
        setInitStatus('failed')
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('[Spotify Web Playback] Authentication Error:', message)
        isInitializing.current = false
        addError(`Authentication failed: ${message}`, { persist: true })
        setInitStatus('failed')
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('[Spotify Web Playback] Account Error:', message)
        isInitializing.current = false
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

    if (window.Spotify) {
      initializePlayer()
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        isScriptLoading = false
        initializePlayer()
      }

      if (!isScriptLoading) {
        isScriptLoading = true
        console.log('[Spotify Web Playback] Loading Spotify SDK script...')
        const script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
      }
    }
  }, [status, getOAuthToken, addError, player])

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (player) {
        console.log('[Spotify Web Playback] Disconnecting player on cleanup')
        player.disconnect()
      }
    }
  }, [player])

  return { player, isReady, deviceId }
}

export default useSpotifyWebPlayback
