'use client'

import { useCallback, useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage, SpotifyCommand } from '@/types/websocket'

/**
 * Hook to manage Spotify commands via the unified service bus.
 * Treats 'HRM Web Player' and remote devices as identical targets.
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

  const execute = useCallback(
    (command: SpotifyCommand, payload?: any) => {
      // Logic: Use active device, or fallback to HRM Web Player
      const targetDeviceId = activeDevice?.id || hrmPlayer?.id || null

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: command,
        deviceId: targetDeviceId || undefined,
        ...payload,
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
