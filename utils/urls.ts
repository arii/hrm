// File: utils/urls.ts (URL Configuration Helper)
/**
 * Centralized URL configuration for development and production environments
 */

/**
 * Builds a WebSocket URL from a standard HTTP/S base URL.
 * @param baseUrl The base URL (e.g., 'https://example.com').
 * @returns The full WebSocket URL (e.g., 'wss://example.com/ws').
 */
const buildWebSocketUrl = (baseUrl: string): string => {
  const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:'
  const host = baseUrl.replace(/^https?:\/\//, '')
  return `${wsProtocol}//${host}/ws`
}

export const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin
  }

  // Server-side: ALWAYS use NEXTAUTH_URL if available (for OAuth consistency)
  return process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'
}

export const getWebSocketURL = (): string => {
  // Priority 1: Explicit full URL from environment variables
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Priority 2: Construct URL from hostname and dedicated WS port (if available)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || '3001'; // Default to 3001 on client-side if not set
    return `${protocol}//${hostname}:${port}/ws`;
  }

  // Priority 3: Server-side fallback (e.g., for SSR or API routes)
  // Note: This assumes the WS server is on the same host as the main app server.
  const host = process.env.HOST || '127.0.0.1';
  const port = process.env.WS_PORT || '3001';
  return `ws://${host}:${port}/ws`;
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
