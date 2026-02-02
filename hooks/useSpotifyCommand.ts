// hooks/useSpotifyCommand.ts
'use client'

import { useCallback, useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'

export const useSpotifyCommand = () => {
  const { spotifyData, sendData } = useWebSocket()

  // Simplified state selectors from the unified bus
  const activeDevice = useMemo(() =>
    spotifyData.devices?.find((d) => d.is_active) || null,
    [spotifyData.devices]
  )

  const hrmPlayer = useMemo(() =>
    spotifyData.devices?.find((d) => d.name === 'HRM Web Player') || null,
    [spotifyData.devices]
  )

  const execute = useCallback(
    (command: string, payload?: any) => {
      // Logic: Use active device, or fallback to HRM Web Player
      const targetDeviceId = activeDevice?.id || hrmPlayer?.id || null

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: command as any,
        deviceId: targetDeviceId,
        ...payload
      }

      sendData(message)
    },
    [sendData, activeDevice, hrmPlayer]
  )

  return {
    execute,
    activeDevice,
    hrmPlayer,
    playback: spotifyData, // Pass the entire playback state
    isHrmPlayerActive: activeDevice?.name === 'HRM Web Player'
  }
}
