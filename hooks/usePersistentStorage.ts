import { useState, useEffect, useCallback, useRef } from 'react'
import Cookies from 'js-cookie'
import isEqual from 'lodash.isequal'

let isLocalStorageAvailable: boolean | null = null

const checkLocalStorage = () => {
  if (typeof window === 'undefined') return false
  if (isLocalStorageAvailable !== null && process.env.NODE_ENV !== 'test') {
    return isLocalStorageAvailable
  }
  try {
    const testKey = 'hrm-storage-test'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    isLocalStorageAvailable = true
  } catch (e) {
    isLocalStorageAvailable = false
  }
  return isLocalStorageAvailable
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

export interface UsePersistentStorageOptions<T> {
  migrate?: (data: unknown) => T
}

function usePersistentStorage<T>(
  key: string,
  initialValue: T,
  options: UsePersistentStorageOptions<T> = {}
) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const lastKeyRef = useRef<string | null>(null)
  const { migrate } = options

  useEffect(() => {
    if (lastKeyRef.current === key) return
    if (typeof window === 'undefined') return

    try {
      const useLocal = checkLocalStorage()
      const item = useLocal
        ? window.localStorage.getItem(key)
        : Cookies.get(key)

      if (item) {
        let parsed = JSON.parse(item)

        if (migrate) {
          parsed = migrate(parsed)
        }

        if (isPlainObject(parsed) && isPlainObject(initialValue)) {
          const merged = { ...initialValue, ...parsed } as T

          if (!isEqual(merged, storedValue)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStoredValue(merged)
          }

          if (useLocal) {
            window.localStorage.setItem(key, JSON.stringify(merged))
          }
        } else {
          if (!isEqual(parsed, storedValue)) {
            setStoredValue(parsed)
          }
        }
      } else {
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
  }, [key, initialValue, storedValue, migrate])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value

          try {
            if (checkLocalStorage()) {
              window.localStorage.setItem(key, JSON.stringify(valueToStore))
            } else {
              Cookies.set(key, JSON.stringify(valueToStore), {
                expires: 365,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
              })
            }
          } catch (storageError) {
            console.error('Storage write failed:', storageError)
            if (checkLocalStorage()) {
              try {
                Cookies.set(key, JSON.stringify(valueToStore), {
                  expires: 365,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'strict',
                })
              } catch (cookieError) {
                console.error('Cookie fallback failed:', cookieError)
              }
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
