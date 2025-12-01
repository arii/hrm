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
  return (
    process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://127.0.0.1:3000'
  )
}

export const getWebSocketURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current host with appropriate protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  // Server-side fallback
  const baseUrl = getBaseURL()
  const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:'
  const host = baseUrl.replace(/^https?:\/\//, '')
  return `${wsProtocol}//${host}/ws`
}

// === QUICK WIN 3: API CONSTANT EXTRACTION ===
export const API_PREFIX = '/api/' // Define the standardized prefix once
// ============================================

export const getAPIURL = (endpoint: string): string => {
  // Normalize endpoint to remove leading slash
  const cleanEndpoint = endpoint.replace(/^\//, '')

  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return `${window.location.origin}${API_PREFIX}${cleanEndpoint}`
  }

  // Server-side: use environment variable for internal API calls
  const baseUrl = getBaseURL()
  return `${baseUrl}${API_PREFIX}${cleanEndpoint}`
}

export const getSpotifyCallbackURL = (): string => {
  return (
    process.env.SPOTIFY_CALLBACK_URL ||
    `${getBaseURL()}${API_PREFIX}auth/callback/spotify`
  )
}
