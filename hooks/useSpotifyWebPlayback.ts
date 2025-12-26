'use client'

import { useEffect, useState } from 'react'
import { useError } from '@/context/ErrorContext'
import { getSpotifyPlayer } from '@/lib/spotify-sdk'
import { SpotifyPlayer } from '@/types/spotify'

interface SpotifyWebPlaybackState {
  player: SpotifyPlayer | null
  isReady: boolean
  deviceId: string | null
  isAuthenticated: boolean
}

const useSpotifyWebPlayback = (
  initialVolume = 0.5
): SpotifyWebPlaybackState => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { addError } = useError()

  useEffect(() => {
    const initialize = async () => {
      try {
        const spotifyPlayer = await getSpotifyPlayer(initialVolume)
        setPlayer(spotifyPlayer)
        setIsAuthenticated(true)

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unknown error occurred.'
        addError(`Authentication failed: ${message}`, 'persistent')
        setIsAuthenticated(false)
      }
    }

    initialize()

    return () => {
      if (player) {
        player.disconnect()
      }
    }
  }, [addError, initialVolume, player])

  return { player, isReady, deviceId, isAuthenticated }
}

export default useSpotifyWebPlayback
