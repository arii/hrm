import { useState, useEffect, useCallback, useRef } from 'react'
import Cookies from 'js-cookie'
import isEqual from 'lodash/isEqual'

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

interface PersistentStorageOptions {
  enableCookieFallback?: boolean
}

function usePersistentStorage<T>(
  key: string,
  initialValue: T,
  options: PersistentStorageOptions = {}
) {
  const { enableCookieFallback = false } = options

  // Initialize state with initialValue to avoid hydration mismatches.
  // The actual stored value will be loaded in a useEffect after mounting.
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Use refs to avoid unnecessary re-renders or effect loops
  const initialValueRef = useRef(initialValue)
  const keyRef = useRef(key)
  const isHydrated = useRef(false)

  // Handle hydration and key/initialValue changes
  useEffect(() => {
    const isLocalAvailable = checkLocalStorage()
    const useCookie = !isLocalAvailable && enableCookieFallback

    const loadFromStorage = () => {
      try {
        let item: string | undefined | null = null
        if (isLocalAvailable) {
          item = window.localStorage.getItem(key)
        } else if (useCookie) {
          item = Cookies.get(key)
        }

        if (item) {
          const parsed = JSON.parse(item)
          let valueToUse = parsed

          if (isPlainObject(parsed) && isPlainObject(initialValue)) {
            const merged = { ...initialValue, ...parsed } as T
            valueToUse = merged

            if (isLocalAvailable) {
              window.localStorage.setItem(key, JSON.stringify(merged))
            }
          }

          setStoredValue((current) => {
            if (!isEqual(valueToUse, current)) {
              return valueToUse
            }
            return current
          })
        }
      } catch (error) {
        console.error(
          `Error reading or parsing persistent storage key “${key}”`,
          error
        )
      }
    }

    if (!isHydrated.current) {
      isHydrated.current = true
      loadFromStorage()
      return
    }

    // Only run if key changed OR initialValue changed significantly
    const keyChanged = keyRef.current !== key
    const initialValueChanged = !isEqual(initialValueRef.current, initialValue)

    if (keyChanged || initialValueChanged) {
      keyRef.current = key
      initialValueRef.current = initialValue

      const isLocalAvailable = checkLocalStorage()
      const useCookie = !isLocalAvailable && enableCookieFallback
      let item: string | undefined | null = null

      if (isLocalAvailable) {
        item = window.localStorage.getItem(key)
      } else if (useCookie) {
        item = Cookies.get(key)
      }

      if (item) {
        loadFromStorage()
      } else {
        setStoredValue((current) => {
          if (!isEqual(initialValue, current)) {
            return initialValue
          }
          return current
        })
      }
    }
  }, [key, initialValue, enableCookieFallback])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentStoredValue) => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value

          const isLocalAvailable = checkLocalStorage()

          if (isLocalAvailable) {
            try {
              window.localStorage.setItem(key, JSON.stringify(valueToStore))
            } catch (storageError) {
              console.error('LocalStorage write failed:', storageError)
            }
          } else if (enableCookieFallback) {
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
    [key, enableCookieFallback]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          setStoredValue((current) => {
            if (!isEqual(parsed, current)) {
              return parsed
            }
            return current
          })
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
