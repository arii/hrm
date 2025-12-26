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

import { loadSpotifySdk, initializePlayer } from '@/lib/spotify-sdk'

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

const useSpotifyWebPlayback = () => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const { addError } = useError()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
        if (appError.code !== 'HTTP_ERROR_401') {
          addError(`Authentication failed: ${appError.message}`, 'persistent')
        }
        setIsAuthenticated(false)
      }
    },
    [addError]
  )

  useEffect(() => {
    const init = async () => {
      await loadSpotifySdk()
      const spotifyPlayer = initializePlayer({
        name: 'HRM Web Player',
        getOAuthToken,
        volume: 0.5,
      })

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        setIsReady(true)
      })

      spotifyPlayer.addListener('not_ready', () => {
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
      await spotifyPlayer.connect()
    }

    fetchWithRetry(API_SPOTIFY_ACCESS_TOKEN).then(() => {
      init()
    })

    return () => {
      player?.disconnect()
    }
  }, [getOAuthToken, addError])

  return { player, isReady, deviceId, isAuthenticated }
}

export default useSpotifyWebPlayback
