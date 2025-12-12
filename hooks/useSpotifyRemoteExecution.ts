'use client'

import { useEffect, useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyExecutionMessage } from '@/types/websocket'
import { useError } from '@/context/ErrorContext'
import { handleSpotifyApiResponse } from '@/utils/apiUtils'

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

  const handleCustomEvent = useCallback(
    async (event: Event) => {
      const message = (event as CustomEvent<SpotifyExecutionMessage>).detail
      if (message.type !== 'EXECUTE_SPOTIFY') return

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
              body: JSON.stringify({ command }),
            })
            break
          case 'NEXT':
          case 'PREVIOUS':
            response = await fetch('/api/spotify/control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command }),
            })
            break
          case 'SET_VOLUME':
            if (volume !== undefined) {
              try {
                const vol = Math.max(0, Math.min(1, volume / 100))
                if (player) {
                  await player.setVolume(vol)
                }
              } catch (localPlayerError: unknown) {
                console.error(
                  '[Dashboard] Local player volume command failed:',
                  localPlayerError
                )
                addError(
                  (localPlayerError as Error).message ||
                    'Failed to set volume on the local player.'
                )
              }
              response = await fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'SET_VOLUME', volume, deviceId }),
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

        if (response) {
          await handleSpotifyApiResponse(response, command)
        }
      } catch (execError: unknown) {
        console.error('[Dashboard] Command execution failed:', execError)
        addError(
          (execError as Error).message ||
            'An unexpected error occurred during Spotify operation.'
        )
      }
    },
    [addError, player]
  )

  useEffect(() => {
    if (!player) return

    console.log('[Spotify Remote] Registering as dashboard')
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    if (typeof window !== 'undefined') {
      window.addEventListener('spotify-remote-command', handleCustomEvent)
      return () => {
        window.removeEventListener('spotify-remote-command', handleCustomEvent)
      }
    }
  }, [player, sendData, handleCustomEvent])
}
