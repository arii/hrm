import { useState, useEffect, useCallback, useRef } from 'react'
import Cookies from 'js-cookie'
import isEqual from 'lodash.isequal'

// Cache the result of localStorage check to avoid redundant operations
let isLocalStorageAvailable: boolean | null = null

const checkLocalStorage = () => {
  if (typeof window === 'undefined') {
    return false
  }
  if (isLocalStorageAvailable !== null && process.env.NODE_ENV !== 'test') {
    return isLocalStorageAvailable
  }
  try {
    const testKey = 'hrm-local-storage-test'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    isLocalStorageAvailable = true
  } catch {
    isLocalStorageAvailable = false
  }
  return isLocalStorageAvailable
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

/**
 * A hook that persists state to either localStorage (preferred) or cookies (fallback).
 * It is SSR-safe by initializing with the provided initialValue and then loading
 * from storage only on the client side during useEffect.
 */
function usePersistentStorage<T>(key: string, initialValue: T) {
  // 1. Initialize state with initialValue to match Server Side rendering.
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const lastKeyRef = useRef<string | null>(null)

  // 2. Sync with storage inside useEffect (Client-side only).
  useEffect(() => {
    // If the key hasn't changed and we've already initialized, skip.
    if (lastKeyRef.current === key) return

    if (typeof window === 'undefined') {
      return
    }

    try {
      const useLocal = checkLocalStorage()
      const item = useLocal
        ? window.localStorage.getItem(key)
        : Cookies.get(key)

      if (item) {
        const parsed = JSON.parse(item)

        // Handle object migration by merging stored data with initial defaults.
        if (isPlainObject(parsed) && isPlainObject(initialValue)) {
          const schemaKeys = Object.keys(initialValue)
          const filteredParsed = Object.keys(parsed).reduce(
            (acc, k) => {
              if (schemaKeys.includes(k)) {
                acc[k] = parsed[k]
              }
              return acc
            },
            {} as Record<string, unknown>
          )

          // Merge: Defaults -> Filtered Storage
          const merged = { ...initialValue, ...filteredParsed } as T

          // Only update state if it actually changed to avoid hydration flicker
          if (!isEqual(merged, storedValue)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStoredValue(merged)
          }

          // Sync back to storage if using local storage to remove zombie keys
          if (useLocal) {
            window.localStorage.setItem(key, JSON.stringify(merged))
          }
        } else {
          if (!isEqual(parsed, storedValue)) {
            setStoredValue(parsed)
          }
        }
      } else {
        // If no item in storage, ensure we are using initialValue
        if (!isEqual(initialValue, storedValue)) {
          setStoredValue(initialValue)
        }
      }
      lastKeyRef.current = key
    } catch (error) {
      console.error(
        `Error reading or parsing persistent storage key “${key}”`,
        error
      )
    }
  }, [key, initialValue, storedValue])

  // Return a wrapped version of useState's setter function that persists the new value.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value

          if (checkLocalStorage()) {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          } else {
            Cookies.set(key, JSON.stringify(valueToStore), {
              expires: 365,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
            })
          }
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting persistent storage key “${key}”:`, error)
      }
    },
    [key]
  )

  // Handle storage events for tab synchronization (only applies to localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (!isEqual(parsed, storedValue)) {
            setStoredValue(parsed)
          }
        } catch (error) {
          console.error(`Error parsing storage change for key “${key}”:`, error)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key, storedValue])

  return [storedValue, setValue] as const
}

export default usePersistentStorage
