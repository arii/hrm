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

interface PersistentStorageOptions {
  enableCookieFallback?: boolean
}

function readStorageValue<T>(
  key: string,
  initialValue: T,
  enableCookieFallback: boolean
): T {
  if (typeof window === 'undefined') return initialValue

  try {
    const isLocalAvailable = checkLocalStorage()
    // Use cookies only if localStorage is unavailable AND fallback is enabled
    const useCookie = !isLocalAvailable && enableCookieFallback

    let item: string | undefined | null = null

    if (isLocalAvailable) {
      item = window.localStorage.getItem(key)
    } else if (useCookie) {
      item = Cookies.get(key)
    }

    if (item) {
      const parsed = JSON.parse(item)

      if (isPlainObject(parsed) && isPlainObject(initialValue)) {
        const merged = { ...initialValue, ...parsed } as T
        // Sync merged value back to storage if using localStorage
        if (isLocalAvailable) {
          window.localStorage.setItem(key, JSON.stringify(merged))
        }
        return merged
      }
      return parsed
    }
  } catch (error) {
    console.error(
      `Error reading or parsing persistent storage key “${key}”`,
      error
    )
  }
  return initialValue
}

function usePersistentStorage<T>(
  key: string,
  initialValue: T,
  options: PersistentStorageOptions = {}
) {
  const { enableCookieFallback = false } = options

  // Read value once during initialization
  const [storedValue, setStoredValue] = useState<T>(() =>
    readStorageValue(key, initialValue, enableCookieFallback)
  )

  // Use refs to avoid unnecessary re-renders or effect loops
  const initialValueRef = useRef(initialValue)
  const keyRef = useRef(key)
  const isMounted = useRef(false)

  // Handle key changes or external initialValue changes
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    // Only run if key changed OR initialValue changed significantly
    const keyChanged = keyRef.current !== key
    const initialValueChanged =
      JSON.stringify(initialValueRef.current) !== JSON.stringify(initialValue)

    if (!keyChanged && !initialValueChanged) return

    keyRef.current = key
    initialValueRef.current = initialValue

    const newValue = readStorageValue(key, initialValue, enableCookieFallback)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredValue((current) => {
      if (JSON.stringify(newValue) !== JSON.stringify(current)) {
        return newValue
      }
      return current
    })
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
            if (JSON.stringify(parsed) !== JSON.stringify(current)) {
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
