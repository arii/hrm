// File: utils/urls.ts (URL Configuration Helper)
/**
 * Centralized URL configuration for development and production environments
 */

import { config } from './config.js'

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

  // Server-side: Use the centralized config value.
  return config.app.baseUrl
}

export const getWebSocketURL = (): string => {
  // Client-side:
  if (typeof window !== 'undefined') {
    // 1. Prioritize the explicit environment variable.
    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (envWsUrl && envWsUrl.length > 0) {
      return buildWebSocketUrl(envWsUrl)
    }
    // 2. Fallback to deriving from the browser's location.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  // Server-side: Directly use the computed config value.
  return config.websocket.url
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
