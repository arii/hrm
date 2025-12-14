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

import config from './config'

export const getWebSocketURL = (): string => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }
  return config.wsUrl
}

export const getAPIURL = (endpoint: string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/${endpoint.replace(/^\//, '')}`
  }
  return `${config.baseURL}/api/${endpoint.replace(/^\//, '')}`
}

export const getSpotifyCallbackURL = (): string => {
  return (
    process.env.SPOTIFY_CALLBACK_URL ||
    `${config.baseURL}/api/auth/callback/spotify`
  )
}

export const getGoogleDocWorkoutUrl = (): string | undefined => {
  return process.env.GOOGLE_DOC_WORKOUT_URL
}
