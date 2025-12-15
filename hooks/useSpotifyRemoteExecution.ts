'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'
import { callSpotifyApi } from '@/lib/api'
import { useError } from '@/context/ErrorContext'

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
  const { addError } = useError()

  useEffect(() => {
    if (!player) return

    // Register this client as the "Dashboard" (The Executor)
    console.log('[Spotify Remote] Registering as dashboard')
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    // Listen for custom events dispatched by the WebSocket context
    const handleCustomEvent = async (event: CustomEvent) => {
      const message = event.detail as SpotifyExecutionMessage
      if (message.type === 'EXECUTE_SPOTIFY') {
        const { command, volume, deviceId } = message.payload
        console.log(`[Dashboard] Executing Remote Command: ${command}`)

        try {
          const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, volume, deviceId }),
          }

          switch (command) {
            case 'PLAY':
            case 'PAUSE':
            case 'NEXT':
            case 'PREVIOUS':
              await callSpotifyApi('/api/spotify/control', {
                ...options,
                body: JSON.stringify({ command }),
              })
              break
            case 'SET_VOLUME':
              if (volume !== undefined) {
                const vol = volume > 1 ? volume / 100 : volume
                player.setVolume(vol)
                await callSpotifyApi('/api/spotify/control', {
                  ...options,
                  body: JSON.stringify({
                    command: 'SET_VOLUME',
                    volume,
                    deviceId,
                  }),
                })
              }
              break
            case 'TRANSFER_PLAYBACK':
              if (deviceId) {
                await callSpotifyApi('/api/spotify/control', {
                  ...options,
                  body: JSON.stringify({ command: 'TRANSFER', deviceId }),
                })
              }
              break
          }
        } catch (execError) {
          console.error('[Dashboard] Command execution failed:', execError)
          addError('Failed to control Spotify. Please try again.')
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
  }, [player, sendData, addError])
}
