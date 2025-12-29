// hooks/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react'

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
        if (
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          parsed !== null &&
          typeof initialValue === 'object' &&
          !Array.isArray(initialValue) &&
          initialValue !== null
        ) {
          setStoredValue({ ...initialValue, ...parsed })
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(`Failed to read from localStorage key “${key}”:`, error)
      // If parsing fails, the hook will fallback to the initialValue.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]) // Only run on mount.

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value
        // Save state
        setStoredValue(valueToStore)
        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.log(error)
      }
    },
    [key, storedValue]
  )

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
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
