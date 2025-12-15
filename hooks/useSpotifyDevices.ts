// hooks/useSpotifyDevices.ts
import { useCallback, useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'

/**
 * Custom hook to manage Spotify Connect devices via WebSocket.
 * This hook provides functionalities to fetch devices and transfer playback.
 * It uses the shared WebSocket connection for all communications.
 *
 * @returns {object} An object containing the list of devices, and functions to fetch devices and transfer playback.
 */
export const useSpotifyDevices = () => {
  const { send, spotifyData, isConnected } = useWebSocket()

  // Effect to automatically fetch devices once the WebSocket is connected.
  useEffect(() => {
    console.log('[useSpotifyDevices] Hook mounted. isConnected:', isConnected)
    if (isConnected) {
      console.log('[useSpotifyDevices] Sending GET_DEVICES command.')
      send({ type: 'SPOTIFY_COMMAND', command: 'GET_DEVICES' })
    }
  }, [isConnected, send])

  // Function to manually request an update of Spotify devices from the server.
  const fetchDevices = useCallback(() => {
    if (isConnected) {
      send({ type: 'SPOTIFY_COMMAND', command: 'GET_DEVICES' })
    }
  }, [isConnected, send])

  // Function to transfer playback to a specific device.
  const transferPlayback = useCallback(
    (deviceId: string) => {
      if (isConnected) {
        send({
          type: 'SPOTIFY_COMMAND',
          command: 'TRANSFER_PLAYBACK',
          deviceId,
        })
      }
    },
    [isConnected, send]
  )

  return {
    devices: spotifyData?.devices || [],
    fetchDevices,
    transferPlayback,
  }
}
