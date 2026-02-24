import { useState, useEffect, useCallback, useRef } from 'react'
import Cookies from 'js-cookie'

let isLocalStorageAvailable: boolean | null = null

const checkLocalStorage = () => {
  if (typeof window === 'undefined') return false
  if (isLocalStorageAvailable !== null && process.env.NODE_ENV !== 'test') {
    return isLocalStorageAvailable
  }
  try {
    const testKey = '__hrm_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    isLocalStorageAvailable = true
    return true
  } catch {
    isLocalStorageAvailable = false
    return false
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

function usePersistentStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const lastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastKeyRef.current === key) return
    if (typeof window === 'undefined') return

    try {
      const useLocal = checkLocalStorage()
      const item = useLocal
        ? window.localStorage.getItem(key)
        : Cookies.get(key)

      if (item) {
        const parsed = JSON.parse(item)

        if (isPlainObject(parsed) && isPlainObject(initialValue)) {
          const merged = { ...initialValue, ...parsed } as T

          if (JSON.stringify(merged) !== JSON.stringify(storedValue)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStoredValue(merged)
          }

          if (useLocal) {
            window.localStorage.setItem(key, JSON.stringify(merged))
          }
        } else {
          if (JSON.stringify(parsed) !== JSON.stringify(storedValue)) {
            setStoredValue(parsed)
          }
        }
      } else {
        if (JSON.stringify(initialValue) !== JSON.stringify(storedValue)) {
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

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value

          if (checkLocalStorage()) {
            try {
              window.localStorage.setItem(key, JSON.stringify(valueToStore))
            } catch (storageError) {
              console.error('LocalStorage write failed:', storageError)
            }
          } else {
            try {
              Cookies.set(key, JSON.stringify(valueToStore), {
                expires: 365,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
              })
            } catch (cookieError) {
              console.error('Cookie write failed:', cookieError)
            }
          }
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting persistent storage key “${key}”:`, error)
      }
    },
    [key]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (JSON.stringify(parsed) !== JSON.stringify(storedValue)) {
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
