'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'
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
          let response: Response | undefined

          switch (command) {
            case 'PLAY':
            case 'PAUSE':
              response = await fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: command }),
              })
              break
            case 'NEXT':
              response = await fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'NEXT' }),
              })
              break
            case 'PREVIOUS':
              response = await fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'PREVIOUS' }),
              })
              break
            case 'SET_VOLUME':
              if (volume !== undefined) {
                // Use both the local player and the API for volume control
                const vol = volume > 1 ? volume / 100 : volume
                await player.setVolume(vol)
                response = await fetch('/api/spotify/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    command: 'SET_VOLUME',
                    volume: volume,
                    deviceId,
                  }),
                })
              }
              break
            case 'TRANSFER_PLAYBACK':
              if (deviceId) {
                response = await fetch('/api/spotify/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ command: 'TRANSFER', deviceId }),
                })
              }
              break
          }

          if (response && !response.ok) {
            const errorData = await response.json()
            throw new Error(
              errorData.message || `Spotify command '${command}' failed`
            )
          }
        } catch (execError) {
          console.error('[Dashboard] Command execution failed:', execError)
          const message =
            execError instanceof Error
              ? execError.message
              : 'An unknown error occurred'
          addError(`Spotify Error: ${message}`)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('spotify-remote-command', handleCustomEvent)

      return () => {
        window.removeEventListener('spotify-remote-command', handleCustomEvent)
      }
    }

    // Return undefined explicitly for server-side rendering
    return undefined
  }, [player, sendData, addError])
}
