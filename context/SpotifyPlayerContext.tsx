// context/SpotifyPlayerContext.tsx
'use client'
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { useError } from './ErrorContext'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import logger from '@/utils/logger'

interface SpotifyPlayer {
  connect: () => Promise<boolean>
  disconnect: () => void
  setVolume: (volume: number) => Promise<void>
  addListener(
    event: 'ready' | 'not_ready',
    callback: (data: { device_id: string }) => void
  ): void
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error',
    callback: (data: { message: string }) => void
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

interface SpotifyPlayerContextType {
  player: SpotifyPlayer | null
  isReady: boolean
  deviceId: string | null
  isAuthenticated: boolean
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | null>(
  null
)

export const SpotifyPlayerProvider = ({
  children,
  initialVolume = 0.5,
}: {
  children: ReactNode
  initialVolume?: number
}) => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const { addError } = useError()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const getOAuthToken = useCallback(
    async (cb: (token: string) => void) => {
      try {
        logger.info('Fetching Spotify OAuth token...')
        const response = await fetch(API_SPOTIFY_ACCESS_TOKEN)
        if (!response.ok) {
          if (response.status === 401) {
            logger.warn('Spotify OAuth token request unauthorized.')
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
        logger.info('Spotify OAuth token fetched successfully.')
        setIsAuthenticated(true)
        cb(accessToken)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unknown error occurred.'
        addError(`Authentication failed: ${message}`, 'persistent')
        setIsAuthenticated(false)
      }
    },
    [addError]
  )

  useEffect(() => {
    logger.info('SpotifyPlayerProvider useEffect triggered.')
    const initializeSDK = () => {
      logger.info('Initializing Spotify SDK...')
      if (!window.Spotify) {
        logger.info('Spotify SDK not found, creating script tag...')
        const script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
      } else {
        logger.info('Spotify SDK already exists, initializing player...')
        initializePlayer()
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        logger.info('onSpotifyWebPlaybackSDKReady called.')
        initializePlayer()
      }
    }

    const initializePlayer = () => {
      if (player) {
        logger.info('Spotify player already initialized, returning.')
        return
      }
      logger.info('Initializing new Spotify player...')

      const spotifyPlayer = new window.Spotify.Player({
        name: 'HRM Web Player',
        getOAuthToken,
        volume: initialVolume,
      })

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        logger.info(`Spotify player ready with device ID: ${device_id}`)
        setDeviceId(device_id)
        setIsReady(true)
      })

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        logger.warn(`Spotify player not ready for device ID: ${device_id}`)
        setIsReady(false)
        setDeviceId(null)
      })

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        logger.error(`Spotify initialization error: ${message}`)
        addError(`Initialization failed: ${message}`, 'persistent')
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        logger.error(`Spotify authentication error: ${message}`)
        addError(`Authentication failed: ${message}`, 'persistent')
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        logger.error(`Spotify account error: ${message}`)
        addError(
          `Account error: ${message}. A Premium account is required.`,
          'persistent'
        )
      })

      setPlayer(spotifyPlayer)

      spotifyPlayer.connect()
    }

    logger.info('Checking for Spotify access token...')
    fetch(API_SPOTIFY_ACCESS_TOKEN).then((response) => {
      if (response.ok) {
        logger.info('Spotify access token found, initializing SDK.')
        initializeSDK()
      } else {
        logger.warn('Spotify access token not found.')
      }
    })

    return () => {
      if (player) {
        logger.info('Disconnecting Spotify player.')
        player.disconnect()
      }
    }
  }, [getOAuthToken, initialVolume, addError])

  const contextValue = {
    player,
    isReady,
    deviceId,
    isAuthenticated,
  }

  return (
    <SpotifyPlayerContext.Provider value={contextValue}>
      {children}
    </SpotifyPlayerContext.Provider>
  )
}

export const useSpotifyPlayer = () => {
  const context = useContext(SpotifyPlayerContext)
  if (!context) {
    throw new Error(
      'useSpotifyPlayer must be used within a SpotifyPlayerProvider'
    )
  }
  return context
}
