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
  // 1. Prioritize the explicit environment variable if it's a non-empty string.
  const envWsUrl = process.env.NEXT_PUBLIC_WS_URL
  if (envWsUrl && envWsUrl.length > 0) {
    return envWsUrl
  }

  // Common logic for client and server fallbacks
  const getWsUrl = (hostname: string, protocol: string): string => {
    const wsProtocol = protocol.startsWith('https:') ? 'wss:' : 'ws:'
    // Use NEXT_PUBLIC_WS_PORT on the client, and WS_PORT on the server, defaulting to 3002
    const port =
      process.env.NEXT_PUBLIC_WS_PORT || process.env.WS_PORT || '3002'
    return `${wsProtocol}//${hostname}:${port}`
  }

  // 2. Fallback for client-side execution, deriving from the browser's location.
  if (typeof window !== 'undefined') {
    return getWsUrl(window.location.hostname, window.location.protocol)
  }

  // 3. Fallback for server-side execution, deriving from the base application URL.
  const baseUrl = new URL(getBaseURL())
  return getWsUrl(baseUrl.hostname, baseUrl.protocol)
}

export const getAPIURL = (endpoint: string): string => {
  // 1. Prioritize the explicit environment variable if it's a non-empty string.
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL
  if (envApiUrl && envApiUrl.length > 0) {
    const cleanedUrl = envApiUrl.replace(/\/$/, '') // Remove trailing slash
    // Strictly adhere to docs: assume no '/api' in the env var.
    return `${cleanedUrl}/api/${endpoint.replace(/^\//, '')}`
  }

  // 2. Fallback for client-side execution, deriving from the browser's origin.
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/${endpoint.replace(/^\//, '')}`
  }

  // 3. Fallback for server-side execution, deriving from the base application URL.
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
