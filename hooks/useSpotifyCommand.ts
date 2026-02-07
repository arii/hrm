'use client'

import { useCallback, useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage, SpotifyCommand } from '@/types/websocket'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'

export const useSpotifyCommand = () => {
  const { spotifyData, sendData } = useWebSocket()

  // Simplified state selectors from the unified bus
  const activeDevice = useMemo(
    () => spotifyData.devices?.find((d) => d.is_active) || null,
    [spotifyData.devices]
  )

  const hrmPlayer = useMemo(
    () =>
      spotifyData.devices?.find((d) => d.name === HRM_WEB_PLAYER_NAME) || null,
    [spotifyData.devices]
  )

  const execute = useCallback(
    (
      command: SpotifyCommand,
      payload?: Partial<Omit<SpotifyCommandMessage, 'type' | 'command'>>
    ) => {
      // Logic: Use active device, or fallback to HRM Web Player
      const targetDeviceId = activeDevice?.id || hrmPlayer?.id || undefined

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId: targetDeviceId,
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
    playback: spotifyData,
    isHrmPlayerActive: activeDevice?.name === HRM_WEB_PLAYER_NAME,
  }
}
