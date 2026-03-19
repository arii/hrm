'use client'

import { useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage, SpotifyCommand } from '@/types/websocket'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'

/**
 * Specific payload types for each Spotify command to ensure type safety.
 */
type SpotifyBasePayload = {
  deviceId?: string
}

type SpotifyPlayPayload = SpotifyBasePayload & {
  playlistUri?: string
  contextUri?: string
  uri?: string
  offset?: { position?: number; uri?: string }
}

type SpotifyVolumePayload = SpotifyBasePayload & {
  volume: number
}

type SpotifyTransferPayload = {
  deviceId: string
}

type CommandPayload =
  | SpotifyPlayPayload
  | SpotifyVolumePayload
  | SpotifyTransferPayload
  | SpotifyBasePayload

/**
 * Interface for the execute function with overloads for stricter type safety.
 */
interface ExecuteSpotify {
  (command: 'PLAY', payload?: SpotifyPlayPayload): void
  (command: 'SET_VOLUME', payload: SpotifyVolumePayload): void
  (command: 'TRANSFER_PLAYBACK', payload: SpotifyTransferPayload): void
  (command: 'PAUSE', payload?: SpotifyBasePayload): void
  (command: 'NEXT', payload?: SpotifyBasePayload): void
  (command: 'PREVIOUS', payload?: SpotifyBasePayload): void
  (command: 'GET_DEVICES', payload?: SpotifyBasePayload): void
  (command: SpotifyCommand, payload?: CommandPayload): void
}

/**
 * Hook to manage Spotify commands via the unified service bus.
 * Treats 'HRM Web Player' and remote devices as identical targets, routing
 * all actions through the server-side single source of truth.
 */
export const useSpotifyCommand = () => {
  const { spotifyData, sendData } = useWebSocket()

  // Simplified state selectors from the unified bus
  const activeDevice = spotifyData.devices?.find((d) => d.is_active) || null

  const hrmPlayer =
    spotifyData.devices?.find((d) => d.name === HRM_WEB_PLAYER_NAME) || null

  /**
   * Dispatches a Spotify command via WebSocket.
   */
  const execute = useCallback<ExecuteSpotify>(
    (command, payload) => {
      // Explicitly handle deviceId priority: Payload override > Active Device > HRM Player
      const payloadDeviceId = (payload as SpotifyBasePayload)?.deviceId
      const resolvedDeviceId =
        payloadDeviceId || activeDevice?.id || hrmPlayer?.id || undefined

      const message: SpotifyCommandMessage = {
        ...(payload || {}),
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId: resolvedDeviceId,
      }

      sendData(message)
    },
    [sendData, activeDevice, hrmPlayer]
  )

  return {
    execute,
    activeDevice,
    hrmPlayer,
    playback: spotifyData.playback, // Track, progress, volume
    isHrmPlayerActive: activeDevice?.name === HRM_WEB_PLAYER_NAME,
  }
}
