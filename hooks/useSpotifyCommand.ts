'use client'

import { useCallback, useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage, SpotifyCommand } from '@/types/websocket'

/**
 * Specific payload types for each Spotify command to ensure type safety.
 */
export type SpotifyBasePayload = {
  deviceId?: string
}

export type SpotifyPlayPayload = SpotifyBasePayload & {
  playlistUri?: string
  contextUri?: string
  uri?: string
  offset?: { position: number }
}

export type SpotifyVolumePayload = SpotifyBasePayload & {
  volume: number
}

export type SpotifyTransferPayload = {
  deviceId: string
}

export type CommandPayload =
  | SpotifyPlayPayload
  | SpotifyVolumePayload
  | SpotifyTransferPayload
  | SpotifyBasePayload

/**
 * Hook to manage Spotify commands via the unified service bus.
 * Treats 'HRM Web Player' and remote devices as identical targets, routing
 * all actions through the server-side single source of truth.
 */
export const useSpotifyCommand = () => {
  const { spotifyData, sendData } = useWebSocket()

  // Simplified state selectors from the unified bus
  const activeDevice = useMemo(
    () => spotifyData.devices?.find((d) => d.is_active) || null,
    [spotifyData.devices]
  )

  const hrmPlayer = useMemo(
    () => spotifyData.devices?.find((d) => d.name === 'HRM Web Player') || null,
    [spotifyData.devices]
  )

  /**
   * Dispatches a Spotify command via WebSocket.
   * uses a union type for the payload to avoid `unknown`
   */
  const execute = useCallback(
    <T extends CommandPayload>(command: SpotifyCommand, payload?: T) => {
      // Explicitly handle deviceId priority: Payload override > Active Device > HRM Player
      const payloadDeviceId = (payload as SpotifyBasePayload)?.deviceId
      const resolvedDeviceId =
        payloadDeviceId || activeDevice?.id || hrmPlayer?.id || undefined

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...payload,
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
    isHrmPlayerActive: activeDevice?.name === 'HRM Web Player',
  }
}
