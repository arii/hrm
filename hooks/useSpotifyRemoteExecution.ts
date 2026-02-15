'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'

/**
 * Hook that enables remote Spotify control on the Dashboard.
 * This hook listens for relayed commands from controllers and executes them
 * by routing them through the centralized /api/spotify/control endpoint.
 */
export const useSpotifyRemoteExecution = (player: unknown | null): void => {
  const { sendData } = useWebSocket()

  useEffect(() => {
    if (!player) return

    // Register this client as the "Dashboard".
    // This allows the server to identify this connection as the primary display.
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })
  }, [player, sendData])
}
