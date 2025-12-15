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
          let requestBody: Record<string, unknown>

          switch (command) {
            case 'PLAY':
            case 'PAUSE':
            case 'NEXT':
            case 'PREVIOUS':
              requestBody = { command }
              break
            case 'SET_VOLUME':
              if (volume !== undefined) {
                const vol = volume > 1 ? volume / 100 : volume
                player.setVolume(vol)
                requestBody = { command: 'SET_VOLUME', volume, deviceId }
              } else {
                throw new Error('Volume not provided for SET_VOLUME command.')
              }
              break
            case 'TRANSFER_PLAYBACK':
              if (deviceId) {
                requestBody = { command: 'TRANSFER', deviceId }
              } else {
                throw new Error(
                  'Device ID not provided for TRANSFER_PLAYBACK command.'
                )
              }
              break
            default:
              console.warn(
                `[Dashboard] Unrecognized Spotify command: ${command}`
              )
              return // Exit if command is not recognized
          }

          await callSpotifyApi('/api/spotify/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          })
        } catch (execError: unknown) {
          const errorMessage =
            execError instanceof Error
              ? execError.message
              : 'An unexpected error occurred.'
          console.error('[Dashboard] Command execution failed:', execError) // Log full context for debugging
          addError(errorMessage) // Pass the specific message extracted by callSpotifyApi
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'spotify-remote-command',
        handleCustomEvent as unknown as EventListener
      )

      return () => {
        window.removeEventListener(
          'spotify-remote-command',
          handleCustomEvent as unknown as EventListener
        )
      }
    }

    // Return undefined explicitly for server-side rendering
    return undefined
  }, [player, sendData, addError])
}
