import { useState, useCallback } from 'react'
import Cookies from 'js-cookie'

function useCookie<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = Cookies.get(key)
      if (!item) return initialValue

      const parsed = JSON.parse(item)

      // Handle object type values
      if (typeof initialValue === 'object' && initialValue !== null) {
        if (typeof parsed === 'object' && parsed !== null) {
          const initialValueKeys = Object.keys(initialValue)
          if (Object.keys(parsed).every((k) => initialValueKeys.includes(k))) {
            return { ...initialValue, ...parsed }
          }
        }
        return initialValue
      }

      // Handle primitive types
      if (typeof parsed === typeof initialValue) {
        return parsed
      }

      return initialValue
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
