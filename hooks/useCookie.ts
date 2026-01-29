
import { useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'

function useCookie<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = Cookies.get(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading or parsing cookie key “${key}”:`, error)
      return initialValue
    }
  })

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
          window.dispatchEvent(new Event(`cookie-change-${key}`))
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting cookie key “${key}”:`, error)
      }
    },
    [key]
  )

  useEffect(() => {
    const handleCookieChange = () => {
      try {
        const item = Cookies.get(key)
        if (item) {
          setStoredValue(JSON.parse(item))
        }
      } catch (error) {
        console.error(`Error parsing cookie change for key “${key}”:`, error)
      }
    }

    window.addEventListener(`cookie-change-${key}`, handleCookieChange)
    return () => {
      window.removeEventListener(`cookie-change-${key}`, handleCookieChange)
    }
  }, [key])

  return [storedValue, setValue]
}

export default useCookie
