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
