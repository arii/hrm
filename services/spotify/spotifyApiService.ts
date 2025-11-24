// File: services/spotify/spotifyApiService.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1/me/player'

async function getAccessToken() {
  const session = await getServerSession(authOptions)
  if (!session || !session.accessToken) {
    throw new Error('Authorization required')
  }
  return session.accessToken
}

export async function sendSpotifyCommand(
  command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS'
) {
  const accessToken = await getAccessToken()
  let endpoint: string
  let method: string

  switch (command) {
    case 'PLAY': {
      endpoint = 'play'
      method = 'PUT'
      break
    }
    case 'PAUSE': {
      endpoint = 'pause'
      method = 'PUT'
      break
    }
    case 'NEXT': {
      endpoint = 'next'
      method = 'POST'
      break
    }
    case 'PREVIOUS': {
      endpoint = 'previous'
      method = 'POST'
      break
    }
    default: {
      throw new Error(`Unhandled Spotify command: ${command}`)
    }
  }

  const response = await fetch(`${SPOTIFY_API_BASE}/${endpoint}`, {
    method: method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status !== 204) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Unknown Spotify API error')
  }

  return { success: true, message: `Command '${command}' executed.` }
}

export async function getSpotifyDevices() {
  const accessToken = await getAccessToken()
  const response = await fetch(`${SPOTIFY_API_BASE}/devices`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Failed to fetch devices')
  }

  return response.json()
}
