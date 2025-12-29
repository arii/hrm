'use client'
import { useState } from 'react'

/**
 * Generates a pseudo-random string that is sufficiently random for non-critical use cases like client IDs.
 * This serves as a fallback for environments where `crypto.randomUUID` is not available.
 * @returns {string} A unique identifier string.
 */
const generateFallbackId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Safely retrieves a UUID using the crypto API if available, otherwise falls back to a pseudo-random generator.
 * @returns {string} A UUID string.
 */
const getUUID = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID()
  }
  return generateFallbackId()
}

/**
 * A custom hook to manage a persisted client ID in localStorage.
 * This hook handles the logic of reading from, writing to, and generating a client ID,
 * while being mindful of the server-side rendering lifecycle to prevent hydration mismatches.
 * @param {string} key The localStorage key to use for storing the client ID.
 * @returns {string | null} The client ID, or null during the initial server render.
 */
function usePersistedClientId(key: string): string | null {
  // By using the lazy initializer pattern for useState, we ensure that the logic to
  // access localStorage only runs on the client-side, and only once during the
  // component's initial render. This resolves the 'set-state-in-effect' linting
  // error by avoiding a separate effect for initialization. The initial state on
  // the server will be null, and the client will hydrate with the persisted value.
  const [id] = useState(() => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        return stored
      }
      const newId = getUUID()
      localStorage.setItem(key, newId)
      return newId
    } catch (e) {
      console.error('LocalStorage access failed:', e)
      // Fallback to an in-memory ID if localStorage is blocked
      return getUUID()
    }
  })
  return id
}

export default usePersistedClientId
