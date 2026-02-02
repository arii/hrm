// hooks/useSpotifyRemoteExecution.ts (Refactored)
'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'

export const useSpotifyRemoteExecution = (player: any | null): void => {
  const { sendData } = useWebSocket()

  useEffect(() => {
    if (!player) return

    // Register as dashboard to ensure WS messages are routed if needed
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    const handleRemoteCommand = async (event: CustomEvent) => {
      const { payload } = event.detail

      // MANDATORY SIMPLICITY: Always route via the Web API
      // This ensures that volume and track state are synchronized
      // globally across all Spotify Connect instances.
      await fetch('/api/spotify/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    window.addEventListener(
      'spotify-remote-command',
      handleRemoteCommand as EventListener
    )
    return () =>
      window.removeEventListener(
        'spotify-remote-command',
        handleRemoteCommand as EventListener
      )
  }, [player, sendData])
}
