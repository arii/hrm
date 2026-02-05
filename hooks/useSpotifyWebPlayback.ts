'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useError } from '@/context/ErrorContext'
import { useSpotifyAuth } from './useSpotifyAuth'

interface SpotifyDeviceEvent {
  device_id: string
}

interface SpotifyErrorEvent {
  message: string
}

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

declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

const useSpotifyWebPlayback = () => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [initStatus, setInitStatus] = useState<
    'idle' | 'initializing' | 'ready' | 'failed'
  >('idle')
  const { addError } = useError()
  const { status, session } = useSpotifyAuth()

  const sessionRef = useRef(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const getOAuthToken = useCallback(
    (cb: (token: string) => void) => {
      const token = sessionRef.current?.accessToken
      if (token) {
        cb(token)
      } else {
        console.error('[Spotify Web Playback] No access token available')
        setInitStatus('failed')
        addError('Failed to authenticate with Spotify: No access token', {
          persist: false,
        })
      }
    },
    [addError]
  )

  useEffect(() => {
    if (status !== 'authenticated' || initStatus !== 'idle') {
      return
    }

    const initTimer = setTimeout(() => {
      setInitStatus('initializing')

      const initializeSDK = () => {
        if (!window.Spotify) {
          console.log('[Spotify Web Playback] Loading Spotify SDK script...')
          const script = document.createElement('script')
          script.src = 'https://sdk.scdn.co/spotify-player.js'
          script.async = true
          document.body.appendChild(script)
        } else {
          console.log('[Spotify Web Playback] Spotify SDK already loaded')
          initializePlayer()
        }
      }

      const initializePlayer = () => {
        if (player) {
          return
        }

        console.log(
          '[Spotify Web Playback] Initializing new player instance...'
        )
        const spotifyPlayer = new window.Spotify.Player({
          name: 'HRM Web Player',
          getOAuthToken,
          volume: 0.5,
        })

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
          addError(
            `Account error: ${message}. A Premium account is required.`,
            {
              persist: true,
            }
          )
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

      window.onSpotifyWebPlaybackSDKReady = initializePlayer

      initializeSDK()
    }, 0)

    return () => {
      clearTimeout(initTimer)
      if (player) {
        console.log('[Spotify Web Playback] Disconnecting player on cleanup')
        player.disconnect()
        setPlayer(null)
      }
      window.onSpotifyWebPlaybackSDKReady = () => {}
    }
  }, [status, initStatus, getOAuthToken, addError, player])

  return { player, isReady, deviceId }
}

export default useSpotifyWebPlayback
