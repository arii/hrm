// lib/spotify-sdk.ts
'use client'
import { API_SPOTIFY_ACCESS_TOKEN } from '@/constants/apiEndpoints'
import { SpotifyPlayer, SpotifyPlayerOptions } from '@/types/spotify'

let player: SpotifyPlayer | null = null
let isInitializing = false
const onReadyCallbacks: ((player: SpotifyPlayer) => void)[] = []

const getOAuthToken = async (cb: (token: string) => void) => {
  try {
    const response = await fetch(API_SPOTIFY_ACCESS_TOKEN)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Spotify access token: ${response.status}`
      )
    }
    const { accessToken } = await response.json()
    if (!accessToken) {
      throw new Error('Access token was not found in the response.')
    }
    cb(accessToken)
  } catch (error) {
    console.error('Error fetching Spotify OAuth token:', error)
  }
}

const initializePlayer = (initialVolume: number) => {
  const SpotifyPlayer = (window.Spotify as any).Player
  const spotifyPlayer = new SpotifyPlayer({
    name: 'HRM Web Player',
    getOAuthToken,
    volume: initialVolume,
  } as SpotifyPlayerOptions)

  spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
    console.log('[Spotify SDK] Ready with Device ID', device_id)
    player = spotifyPlayer
    onReadyCallbacks.forEach((callback) => callback(player as SpotifyPlayer))
    onReadyCallbacks.length = 0
  })

  spotifyPlayer.connect().then((success: boolean) => {
    if (success) {
      console.log(
        '[Spotify SDK] The Web Playback SDK successfully connected to Spotify!'
      )
    }
  })
}

export const getSpotifyPlayer = (
  initialVolume = 0.5
): Promise<SpotifyPlayer> => {
  return new Promise((resolve) => {
    if (player) {
      resolve(player)
      return
    }

    onReadyCallbacks.push(resolve)

    if (!isInitializing) {
      isInitializing = true
      if (typeof window !== 'undefined') {
        if (!window.Spotify) {
          const script = document.createElement('script')
          script.src = 'https://sdk.scdn.co/spotify-player.js'
          script.async = true
          document.body.appendChild(script)

          window.onSpotifyWebPlaybackSDKReady = () => {
            initializePlayer(initialVolume)
          }
        } else {
          initializePlayer(initialVolume)
        }
      }
    }
  })
}
