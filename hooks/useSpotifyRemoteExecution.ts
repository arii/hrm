'use client'

import { useEffect, useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'
import { useToast } from './useToast'

// Define the shape of the player object from useSpotifyWebPlayback hook
interface SpotifyPlayerInstance {
  setVolume: (volume: number) => Promise<void>
  _options?: {
    id: string
    name: string
  }
}

/**
 * Hook that enables remote Spotify control on the Dashboard.
 * This hook listens for relayed commands from controllers and executes them
 * using the local Spotify Player SDK instance.
 */
export const useSpotifyRemoteExecution = (
  player: SpotifyPlayerInstance | null
): void => {
  const { sendData } = useWebSocket()
  const { addToast } = useToast()

  const executeApiCommand = useCallback(
    async (body: object) => {
      try {
        const response = await fetch('/api/spotify/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const message = errorData.error || 'An unknown API error occurred.'
          addToast(message, 'error')
          console.error('[Dashboard] API Command failed:', message)
        }
      } catch (error) {
        console.error('[Dashboard] Network error executing command:', error)
        addToast(
          'Failed to send command. Please check your connection.',
          'error'
        )
      }
    },
    [addToast]
  )

  useEffect(() => {
    if (!player) return

    // Register this client as the "Dashboard" (The Executor)
    console.log('[Spotify Remote] Registering as dashboard')
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    // Listen for custom events dispatched by the WebSocket context
    const handleCustomEvent = (event: CustomEvent) => {
      const message = event.detail as SpotifyExecutionMessage
      if (message.type === 'EXECUTE_SPOTIFY') {
        const { command, volume, deviceId } = message.payload
        console.log(`[Dashboard] Executing Remote Command: ${command}`)

        switch (command) {
          case 'PLAY':
          case 'PAUSE':
            executeApiCommand({ command: command })
            break
          case 'NEXT':
            executeApiCommand({ command: 'NEXT' })
            break
          case 'PREVIOUS':
            executeApiCommand({ command: 'PREVIOUS' })
            break
          case 'SET_VOLUME':
            if (volume !== undefined) {
              const vol = volume > 1 ? volume / 100 : volume
              player.setVolume(vol).catch((err) => {
                console.error('Failed to set local volume', err)
                addToast('Failed to set local player volume.', 'error')
              })
              executeApiCommand({
                command: 'SET_VOLUME',
                volume: volume,
                deviceId,
              })
            }
            break
          case 'TRANSFER_PLAYBACK':
            if (deviceId) {
              executeApiCommand({ command: 'TRANSFER', deviceId })
            }
            break
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'spotify-remote-command',
        handleCustomEvent as EventListener
      )

      return () => {
        window.removeEventListener(
          'spotify-remote-command',
          handleCustomEvent as EventListener
        )
      }
    }

    // Return undefined explicitly for server-side rendering
    return undefined
  }, [player, sendData, addToast, executeApiCommand])
}
