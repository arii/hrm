// hooks/useLocalStorage.ts
import { useState, useEffect, useCallback, useRef } from 'react'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  // 1. Initialize state with initialValue to match Server Side rendering.
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const initialValueRef = useRef(initialValue)

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
        if (
          isPlainObject(parsed) &&
          isPlainObject(initialValueRef.current)
        ) {
          setStoredValue({ ...initialValueRef.current, ...parsed })
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(
        `Failed to read or parse from localStorage key “${key}”:`,
        error
      )
      // If parsing fails, the hook will fallback to the initialValue.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      // Prevent execution on server.
      if (typeof window === 'undefined') {
        return
      }
      try {
        // Use a functional update to get the latest state value.
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          return valueToStore
        })
      } catch (error) {
        console.error(`Failed to set localStorage key “${key}”:`, error)
      }
    },
    [key]
  )

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (typeof window !== 'undefined' && e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(
            `Failed to parse storage change from localStorage key “${key}”:`,
            error
          )
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
