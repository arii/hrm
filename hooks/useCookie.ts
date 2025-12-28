// hooks/useCookie.ts
'use client'
import { useState, useCallback, useEffect } from 'react'
import logger from '@/utils/logger'
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf'
import { getCookie, setCookie } from '@/utils/cookie'

function useCookie<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getCookie(key)
      if (!item) return initialValue

      return JSON.parse(decodeURIComponent(item))
    } catch (error) {
      logger.warn(
        { key, error, value: getCookie(key) },
        `Failed to parse cookie "${key}". Using initial value.`
      )
      // If parsing fails, remove the malformed cookie
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
      return initialValue
    }
  })

  useEffect(() => {
    const csrfToken = getCookie(CSRF_COOKIE_NAME)
    if (!csrfToken) {
      setCookie(CSRF_COOKIE_NAME, generateCsrfToken())
    }
  }, [])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)

        if (valueToStore === null || valueToStore === undefined) {
          // Remove the cookie if the value is null or undefined
          if (typeof document !== 'undefined') {
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          }
        } else {
          setCookie(key, encodeURIComponent(JSON.stringify(valueToStore)))
        }
      } catch (error) {
        logger.error({ key, error }, `Failed to set cookie "${key}".`)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}

export default useCookie
