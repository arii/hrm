// hooks/useSpotifyRemoteExecution.ts (Refactored)
'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'

interface SpotifyPlayer {
  setVolume(volume: number): Promise<void>
}

export const useSpotifyRemoteExecution = (player: unknown | null): void => {
  const { sendData } = useWebSocket()

  useEffect(() => {
    if (!player) return

    // Register as dashboard to ensure WS messages are routed if needed
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    const handleRemoteCommand = async (event: CustomEvent) => {
      const { payload } = event.detail

      // Optimistic update for volume
      if (
        payload.command === 'SET_VOLUME' &&
        typeof payload.volumePercent === 'number'
      ) {
        try {
          // Spotify Web Playback SDK uses 0-1 scale, while our app uses 0-100
          const volumeFloat = payload.volumePercent / 100
          await (player as unknown as SpotifyPlayer).setVolume(volumeFloat)
        } catch (error) {
          console.warn('Failed to optimistically set volume:', error)
        }
      }

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
      handleRemoteCommand as unknown as EventListener
    )
    return () =>
      window.removeEventListener(
        'spotify-remote-command',
        handleRemoteCommand as unknown as EventListener
      )
  }, [player, sendData])
}
