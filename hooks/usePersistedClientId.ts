'use client'
import { useState, useEffect } from 'react'

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
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        setId(stored)
      } else {
        const newId = getUUID()
        localStorage.setItem(key, newId)
        setId(newId)
      }
    } catch (e) {
      console.error('LocalStorage access failed:', e)
      setId(getUUID()) // Fallback to an in-memory ID if localStorage is blocked
    }
  }, [key])

  return id
}

export default usePersistedClientId
