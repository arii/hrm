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
  // Use explicit environment variable if available
  if (process.env.NEXT_PUBLIC_WS_URL) {
    // Expect NEXT_PUBLIC_WS_URL to be a base URL (e.g., 'https://your-ws-host.com')
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '') // Ensure no trailing slash
    const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:'
    const host = baseUrl.replace(/^https?:\/\//, '')
    return `${wsProtocol}//${host}/ws`
  }

  // Fallback for client-side execution
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  // Fallback for server-side execution
  const baseUrl = getBaseURL()
  const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:'
  const host = baseUrl.replace(/^https?:\/\//, '')
  return `${wsProtocol}//${host}/ws`
}

export const getAPIURL = (endpoint: string): string => {
  // Use explicit environment variable if available
  if (process.env.NEXT_PUBLIC_API_URL) {
    let baseUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') // Remove trailing slash if any
    if (baseUrl.endsWith('/api')) {
      // Remove '/api' if present at the end
      baseUrl = baseUrl.slice(0, -4)
    }
    return `${baseUrl}/api/${endpoint.replace(/^\//, '')}`
  }

  // Fallback for client-side execution
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/${endpoint.replace(/^\//, '')}`
  }

  // Fallback for server-side execution
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
