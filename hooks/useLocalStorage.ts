// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

// A custom hook for persisting state to localStorage.
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Effect to read from localStorage on component mount (client-side only).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        if (isPlainObject(parsed) && isPlainObject(initialValue)) {
          // Filter out keys from localStorage that are not in the initialValue schema.
          const initialValueKeys = Object.keys(initialValue)
          const filteredParsed = Object.keys(parsed).reduce(
            (acc, currentKey) => {
              if (initialValueKeys.includes(currentKey)) {
                acc[currentKey] = parsed[currentKey]
              }
              return acc
            },
            {} as Record<string, unknown>
          )

          // Merge the defaults with the cleaned data from localStorage.
          const merged = { ...initialValue, ...filteredParsed } as T
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStoredValue(merged) // State change will trigger the write useEffect.
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error)
      // If an error occurs (e.g., malformed JSON), revert to initialValue
      // and clear the corrupted item from localStorage to prevent future issues.
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
      // Ensure the hook's state is reset to the initial value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStoredValue(initialValue)
    }
  }, [key, initialValue]) // initialValue is a dependency for object merging

  // Effect to write to localStorage whenever the state changes.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error)
    }
  }, [key, storedValue])

  // Effect to listen for changes in other tabs.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

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

  return [storedValue, setStoredValue] as const
}

export default useLocalStorage
