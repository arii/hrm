'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'

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

        const executeCommand = async (
          cmd: string,
          payload: Record<string, unknown>
        ) => {
          try {
            const res = await fetch('/api/spotify/control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!res.ok) {
              const text = await res.text()
              console.error(
                `[Dashboard] Command ${cmd} failed: ${res.status}`,
                text
              )
            }
          } catch (err) {
            console.error(`[Dashboard] Command ${cmd} fetch error:`, err)
          }
        }

        switch (command) {
          case 'PLAY':
          case 'PAUSE':
            await executeCommand(command, { command })
            break
          case 'NEXT':
            await executeCommand('NEXT', { command: 'NEXT' })
            break
          case 'PREVIOUS':
            await executeCommand('PREVIOUS', { command: 'PREVIOUS' })
            break
          case 'SET_VOLUME':
            if (volume !== undefined) {
              const vol = volume > 1 ? volume / 100 : volume
              player.setVolume(vol)
              await executeCommand('SET_VOLUME', {
                command: 'SET_VOLUME',
                volume,
                deviceId,
              })
            }
            break
          case 'TRANSFER_PLAYBACK':
            if (deviceId) {
              await executeCommand('TRANSFER_PLAYBACK', {
                command: 'TRANSFER_PLAYBACK',
                deviceId,
              })
            }
            break
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
  }, [player, sendData])
}
