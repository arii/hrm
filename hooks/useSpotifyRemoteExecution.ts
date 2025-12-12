'use client'

import { useEffect, useCallback } from 'react'
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
              if (player) {
                player.setVolume(volume / 100).catch((e: Error) => {
                  console.error('Error setting local volume:', e)
                  addError(
                    `Failed to set volume on local player: ${
                      e.message || 'unknown error'
                    }.`
                  )
                })
              }
              response = await fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
              response = await fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'TRANSFER', deviceId }),
              })
            }
            break
        }

        if (response && !response.ok) {
          let errorData: { message?: string } = {}
          try {
            const contentType = response.headers.get('Content-Type')
            if (contentType && contentType.includes('application/json')) {
              errorData = await response.json()
            } else {
              const errorText = await response.text()
              console.warn('Spotify API returned non-JSON error:', errorText)
              errorData = {
                message:
                  errorText.substring(0, 200) +
                  (errorText.length > 200 ? '...' : ''),
              }
            }
          } catch (jsonParseError) {
            console.error(
              'Failed to parse Spotify API error response as JSON:',
              jsonParseError
            )
            errorData = {
              message: `API responded with an unexpected format (Status: ${response.status})`,
            }
          }
          throw new Error(
            errorData.message ||
              `Spotify command '${command}' failed with status ${response.status}.`
          )
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
    return undefined
  }, [player, sendData, handleCustomEvent])
}
