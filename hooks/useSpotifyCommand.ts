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
   * Overloaded to provide strict type checking for each command's payload.
   */
  const execute = useCallback(
    (command: SpotifyCommand, payload?: unknown) => {
      // Logic: Use active device, or fallback to HRM Web Player
      const targetDeviceId = activeDevice?.id || hrmPlayer?.id || null

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: command,
        deviceId: targetDeviceId || undefined,
        ...(payload as Record<string, unknown>),
      }

      sendData(message)
    },
    [sendData, activeDevice, hrmPlayer]
  ) as {
    (command: 'PLAY', payload?: SpotifyPlayPayload): void
    (command: 'SET_VOLUME', payload: SpotifyVolumePayload): void
    (command: 'TRANSFER_PLAYBACK', payload: SpotifyTransferPayload): void
    (
      command: 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'GET_DEVICES',
      payload?: SpotifyBasePayload
    ): void
  }

  return {
    execute,
    activeDevice,
    hrmPlayer,
    playback: spotifyData.playback, // Track, progress, volume
    isHrmPlayerActive: activeDevice?.name === 'HRM Web Player',
  }
}
