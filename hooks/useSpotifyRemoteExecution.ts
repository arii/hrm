'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'
import { useError } from '@/context/ErrorContext'
import { callSpotifyApi } from '@/lib/spotify/api'

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
          switch (command) {
            case 'PLAY':
            case 'PAUSE':
              await callSpotifyApi(command, {}, addError)
              break
            case 'NEXT':
              await callSpotifyApi('NEXT', {}, addError)
              break
            case 'PREVIOUS':
              await callSpotifyApi('PREVIOUS', {}, addError)
              break
            case 'SET_VOLUME':
              if (volume !== undefined) {
                const vol = volume > 1 ? volume / 100 : volume
                await player.setVolume(vol)
                await callSpotifyApi(
                  'SET_VOLUME',
                  { volume, deviceId },
                  addError
                )
              }
              break
            case 'TRANSFER_PLAYBACK':
              if (deviceId) {
                await callSpotifyApi(
                  'TRANSFER_PLAYBACK',
                  { deviceId },
                  addError
                )
              }
              break
          }
        } catch (execError) {
          console.error('[Dashboard] Command execution failed:', execError)
        }
      }
    }

    if (typeof window !== 'undefined') {
      const eventListener = (event: Event) => {
        try {
          handleCustomEvent(event as CustomEvent)
        } catch (error) {
          console.error('Unhandled error in event listener:', error)
        }
      }

      window.addEventListener('spotify-remote-command', eventListener)

      return () => {
        window.removeEventListener('spotify-remote-command', eventListener)
      }
    }

    // Return undefined explicitly for server-side rendering
    return undefined
  }, [player, sendData, addError])
}
