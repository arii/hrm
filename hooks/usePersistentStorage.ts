import { useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'

const checkLocalStorage = () => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    const testKey = 'hrm-local-storage-test'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
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

  // 2. Sync with storage inside useEffect (Client-side only).
  useEffect(() => {
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
          // Specific sanitization for user-prefs (legacy support)
          if (
            'userAge' in parsed &&
            typeof parsed.userAge !== 'number' &&
            parsed.userAge !== null
          ) {
            parsed.userAge = null
          }
          if ('userName' in parsed && typeof parsed.userName !== 'string') {
            parsed.userName = ''
          }

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
          setStoredValue(merged)

          // Sync back to storage if using local storage to remove zombie keys
          if (useLocal) {
            window.localStorage.setItem(key, JSON.stringify(merged))
          }
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(
        `Error reading or parsing persistent storage key “${key}”`,
        error
      )
    }
  }, [key, initialValue])

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
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error parsing storage change for key “${key}”:`, error)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key])

  return [storedValue, setValue] as const
}

export default usePersistentStorage
