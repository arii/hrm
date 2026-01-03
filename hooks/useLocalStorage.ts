// hooks/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

// Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  // 1. Initialize state with initialValue to match Server Side rendering.
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // 2. Sync with localStorage inside useEffect (Client-side only).
  useEffect(() => {
    // Prevent execution on server.
    if (typeof window === 'undefined') {
      return
    }

    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)

        // Handle object migration by merging stored data with initial defaults.
        if (isPlainObject(parsed) && isPlainObject(initialValue)) {
          const schemaKeys = Object.keys(initialValue)
          const filteredParsed = Object.keys(parsed).reduce(
            (acc: { [key: string]: unknown }, k) => {
              if (schemaKeys.includes(k)) {
                acc[k] = parsed[k]
              }
              return acc
            },
            {}
          )

          // Merge: Defaults -> Filtered Storage
          const merged = { ...initialValue, ...filteredParsed } as T
          // This is the core of the SSR-safe logic. We initialize state to `initialValue`
          // and then update it with the value from localStorage on the client.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStoredValue(merged)
          // Also, update localStorage to remove zombie keys.
          window.localStorage.setItem(key, JSON.stringify(merged))
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(`Error reading or parsing localStorage key “${key}”`, error)
    }
  }, [key, initialValue])

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Attempted to set localStorage key “${key}” on the server.`
        )
        return
      }
      try {
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error)
      }
    },
    [key]
  )

  useEffect(() => {
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

export default useLocalStorage
