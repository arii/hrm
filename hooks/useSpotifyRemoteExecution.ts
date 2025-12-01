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
export const useSpotifyRemoteExecution = (player: SpotifyPlayerInstance | null): void => {
  const { sendData } = useWebSocket()

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

        try {
          switch (command) {
            case 'PLAY':
            case 'PAUSE':
              // Use the Spotify Web API for playback control
              fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: command })
              })
              break
            case 'NEXT':
              fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'NEXT' })
              })
              break
            case 'PREVIOUS':
              fetch('/api/spotify/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'PREVIOUS' })
              })
              break
            case 'SET_VOLUME':
              if (volume !== undefined) {
                // Use both the local player and the API for volume control
                const vol = volume > 1 ? volume / 100 : volume
                player.setVolume(vol)
                fetch('/api/spotify/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ command: 'SET_VOLUME', volume: volume, deviceId })
                })
              }
              break
            case 'TRANSFER_PLAYBACK':
              if (deviceId) {
                 fetch('/api/spotify/control', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ command: 'TRANSFER', deviceId })
                 })
              }
              break
          }
        } catch (execError) {
          console.error('[Dashboard] Command execution failed:', execError)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('spotify-remote-command', handleCustomEvent as EventListener)
      
      return () => {
        window.removeEventListener('spotify-remote-command', handleCustomEvent as EventListener)
      }
    }
    
    // Return undefined explicitly for server-side rendering
    return undefined
  }, [player, sendData])
}