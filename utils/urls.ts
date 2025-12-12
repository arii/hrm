// File: utils/urls.ts (URL Configuration Helper)
/**
 * Centralized URL configuration for development and production environments
 */

export const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin
  }

  // Server-side: ALWAYS use NEXTAUTH_URL if available (for OAuth consistency)
  return process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'
}

export const getWebSocketURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current hostname with the dedicated WS port
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '3002'
    return `${protocol}//${window.location.hostname}:${wsPort}/ws`
  }

  // Server-side fallback
  const wsProtocol = getBaseURL().startsWith('https:') ? 'wss:' : 'ws:'
  const host = getBaseURL().replace(/^https?:\/\//, '').split(':')[0]
  const wsPort = process.env.WS_PORT || '3002'
  return `${wsProtocol}//${host}:${wsPort}/ws`
}

export const getAPIURL = (endpoint: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin (allows localhost access in production)
    return `${window.location.origin}/api/${endpoint.replace(/^\//, '')}`
  }

  // Server-side: use environment variable for internal API calls
  const baseUrl = getBaseURL()
  return `${baseUrl}/api/${endpoint.replace(/^\//, '')}`
}

export const getSpotifyCallbackURL = (): string => {
  return (
    process.env.SPOTIFY_CALLBACK_URL ||
    `${getBaseURL()}/api/auth/callback/spotify`
  )
}

export const getGoogleDocWorkoutUrl = (): string | undefined => {
  return process.env.GOOGLE_DOC_WORKOUT_URL
}
