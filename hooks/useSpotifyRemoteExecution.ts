'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'
import { useToast } from '@/context/ToastContext'

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
  const { showToast } = useToast()

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

        const handleResponse = async (response: Response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage =
              errorData.error || `Spotify command '${command}' failed.`
            showToast(errorMessage, 'error')
            console.error(
              `[Dashboard] Spotify command '${command}' failed:`,
              response.statusText
            )
          }
        }

        const handleError = (error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          showToast(`An unexpected error occurred: ${errorMessage}`, 'error')
          console.error('[Dashboard] Command execution failed:', error)
        }

        try {
          switch (command) {
            case 'PLAY':
            case 'PAUSE':
              // Use the Spotify Web API for playback control
              fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: command }),
              })
                .then(handleResponse)
                .catch(handleError)
              break
            case 'NEXT':
              fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'NEXT' }),
              })
                .then(handleResponse)
                .catch(handleError)
              break
            case 'PREVIOUS':
              fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'PREVIOUS' }),
              })
                .then(handleResponse)
                .catch(handleError)
              break
            case 'SET_VOLUME':
              if (volume !== undefined) {
                // Use both the local player and the API for volume control
                const vol = volume > 1 ? volume / 100 : volume
                player.setVolume(vol).catch(handleError)
                fetch('/api/spotify/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    command: 'SET_VOLUME',
                    volume: volume,
                    deviceId,
                  }),
                })
                  .then(handleResponse)
                  .catch(handleError)
              }
              break
            case 'TRANSFER_PLAYBACK':
              if (deviceId) {
                fetch('/api/spotify/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ command: 'TRANSFER', deviceId }),
                })
                  .then(handleResponse)
                  .catch(handleError)
              }
              break
          }
        } catch (execError) {
          handleError(execError)
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
  }, [player, sendData, showToast])
}
