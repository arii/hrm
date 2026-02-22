import { useState, useCallback, useEffect } from 'react'
import Cookies from 'js-cookie'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

function useCookie<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // 1. Initialize state with initialValue to match Server Side rendering.
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // 2. Sync with cookie inside useEffect (Client-side only).
  useEffect(() => {
    try {
      const item = Cookies.get(key)
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
          setStoredValue(merged)
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(`Error reading or parsing cookie key “${key}”:`, error)
    }
  }, [key, initialValue])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value
          Cookies.set(key, JSON.stringify(valueToStore), {
            expires: 365,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
          })
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting cookie key “${key}”:`, error)
      }
    },
    [key]
  )

  return [storedValue, setValue]
}

export default useCookie
