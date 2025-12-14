'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import useApi from './useApi'
import { SpotifyExecutionMessage } from '@/types/websocket'

interface SpotifyPlayerInstance {
  setVolume: (volume: number) => Promise<void>
  _options?: {
    id: string
    name: string
  }
}

export const useSpotifyRemoteExecution = (
  player: SpotifyPlayerInstance | null
): void => {
  const { sendData } = useWebSocket()
  const { request: controlRequest } = useApi()

  useEffect(() => {
    if (!player) return

    console.log('[Spotify Remote] Registering as dashboard')
    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })

    const handleCustomEvent = (event: CustomEvent) => {
      const message = event.detail as SpotifyExecutionMessage
      if (message.type === 'EXECUTE_SPOTIFY') {
        const { command, volume, deviceId } = message.payload
        console.log(`[Dashboard] Executing Remote Command: ${command}`)

        const spotifyApiCall = (body: Record<string, unknown>) =>
          controlRequest('/api/spotify/control', { method: 'POST', body })

        switch (command) {
          case 'PLAY':
          case 'PAUSE':
          case 'NEXT':
          case 'PREVIOUS':
            spotifyApiCall({ command })
            break
          case 'SET_VOLUME':
            if (volume !== undefined) {
              const vol = volume > 1 ? volume / 100 : volume
              player.setVolume(vol)
              spotifyApiCall({ command: 'SET_VOLUME', volume, deviceId })
            }
            break
          case 'TRANSFER_PLAYBACK':
            if (deviceId) {
              spotifyApiCall({ command: 'TRANSFER', deviceId })
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

    return undefined
  }, [player, sendData, controlRequest])
}
