'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'

/**
 * Hook that enables remote Spotify control on the Dashboard.
 * This hook listens for relayed commands from controllers and executes them
 * by routing them through the centralized /api/spotify/control endpoint.
 */
export const useSpotifyRemoteExecution = (player: any | null): void => {
  const { sendData } = useWebSocket()

  useEffect(() => {
    if (!player) return

    // Register this client as the "Dashboard" (The Executor)
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    const handleRemoteCommand = async (event: CustomEvent) => {
      const { payload } = event.detail

      // MANDATORY SIMPLICITY: Always route via the Web API
      // This ensures that volume and track state are synchronized
      // globally across all Spotify Connect instances.
      try {
        const res = await fetch('/api/spotify/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const text = await res.text()
          console.error(
            `[Spotify Remote] Command failed: ${res.status}`,
            text
          )
        }
      } catch (err) {
        console.error('[Spotify Remote] Fetch error:', err)
      }
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
