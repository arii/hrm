// hooks/useSpotifyControls.ts
'use client'

import { useCallback, useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { resolveSpotifyDeviceId } from '@/lib/spotify/device'
import { SpotifyCommandMessage } from '@/types/websocket'

/**
 * Custom hook to encapsulate Spotify control logic.
 *
 * This hook provides a centralized way to manage Spotify commands,
 * abstracting the WebSocket communication and device ID resolution.
 *
 * @returns An object containing the `sendSpotifyCommand` function.
 */
export const useSpotifyControls = () => {
  const { spotifyData, sendData } = useWebSocket()

  const spotifyDeviceId = useMemo(
    () => resolveSpotifyDeviceId(spotifyData?.devices || []),
    [spotifyData?.devices]
  )

  const sendSpotifyCommand = useCallback(
    (command: 'NEXT' | 'PAUSE') => {
      const deviceId = spotifyDeviceId || null
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...(deviceId ? { deviceId } : {}),
      }
      sendData(message)
    },
    [sendData, spotifyDeviceId]
  )

  return { sendSpotifyCommand }
}
